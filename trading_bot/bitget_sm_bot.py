"""
Smart Money Liquidity Sweep Bot - Bitget
Strategie: BSL/SSL Sweep Detection + Reversal Entry

Ausfuehren: python bitget_sm_bot.py
Voraussetzung: pip install -r requirements.txt
"""

import time
import logging
from typing import Optional, Tuple

import ccxt
import pandas as pd

from config import (
    API_KEY, API_SECRET, API_PASSPHRASE,
    SYMBOL, TIMEFRAME, HTF_TIMEFRAME,
    SWING_STRENGTH, SWING_LOOKBACK,
    RISK_PERCENT, RR_RATIO, LEVERAGE,
    USE_HTF_FILTER, TRADE_BUY, TRADE_SELL,
    SL_BUFFER_PCT, CHECK_INTERVAL_SEC,
    EMA_FAST, EMA_SLOW,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    handlers=[
        logging.FileHandler("sm_bot.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("sm_bot")


class SmartMoneyBot:
    """Smart Money Liquidity Sweep Bot fuer Bitget Futures."""

    def __init__(self) -> None:
        self.exchange = ccxt.bitget({
            "apiKey":   API_KEY,
            "secret":   API_SECRET,
            "password": API_PASSPHRASE,
            "enableRateLimit": True,
            "options":  {"defaultType": "swap"},
        })
        self.exchange.load_markets()
        log.info("Bot gestartet | Symbol: %s | TF: %s | HTF: %s",
                 SYMBOL, TIMEFRAME, HTF_TIMEFRAME)

    # ------------------------------------------------------------------
    # Marktdaten
    # ------------------------------------------------------------------
    def _fetch_ohlcv(self, timeframe: str, limit: int = 250) -> pd.DataFrame:
        raw = self.exchange.fetch_ohlcv(SYMBOL, timeframe, limit=limit)
        df = pd.DataFrame(raw, columns=["ts", "open", "high", "low", "close", "volume"])
        df["ts"] = pd.to_datetime(df["ts"], unit="ms")
        return df

    # ------------------------------------------------------------------
    # Swing-Level Erkennung
    # ------------------------------------------------------------------
    def find_swing_levels(self, df: pd.DataFrame) -> Tuple[float, float]:
        """
        Findet den hoechsten Swing High (BSL) und tiefsten Swing Low (SSL)
        im Lookback-Fenster.
        Gibt (bsl, ssl) zurueck; 0.0 wenn nicht gefunden.
        """
        s = SWING_STRENGTH
        highs = df["high"].values
        lows  = df["low"].values
        n = len(df)

        bsl = 0.0
        ssl = float("inf")

        # Indizes: 0 = aelteste Kerze, -1 = aktuell laufende (nicht abgeschlossen)
        # Wir suchen rueckwaerts ab Index -(2) bis -(SWING_LOOKBACK)
        end = min(SWING_LOOKBACK + s + 1, n - s - 1)

        for i in range(s + 1, end):
            idx = n - 1 - i  # Aktuell laufende Kerze ist n-1, die letzte abgeschlossene ist n-2

            hi = highs[idx]
            lo = lows[idx]

            # Swing High: alle s Nachbarn links und rechts kleiner
            is_swing_high = (
                all(highs[idx - j] < hi for j in range(1, s + 1)) and
                all(highs[idx + j] < hi for j in range(1, s + 1))
            )
            if is_swing_high and hi > bsl:
                bsl = hi

            # Swing Low: alle s Nachbarn links und rechts groesser
            is_swing_low = (
                all(lows[idx - j] > lo for j in range(1, s + 1)) and
                all(lows[idx + j] > lo for j in range(1, s + 1))
            )
            if is_swing_low and lo < ssl:
                ssl = lo

        return bsl, (0.0 if ssl == float("inf") else ssl)

    # ------------------------------------------------------------------
    # HTF Trend-Bias
    # ------------------------------------------------------------------
    def get_htf_bias(self) -> int:
        """
        Berechnet den HTF-Trend via EMA-Kreuzung.
        +1 = bullisch, -1 = baerisch, 0 = neutral.
        """
        df = self._fetch_ohlcv(HTF_TIMEFRAME, EMA_SLOW + 10)
        ema_fast  = df["close"].ewm(span=EMA_FAST,  adjust=False).mean().iloc[-1]
        ema_slow  = df["close"].ewm(span=EMA_SLOW, adjust=False).mean().iloc[-1]
        if ema_fast > ema_slow:
            return 1
        if ema_fast < ema_slow:
            return -1
        return 0

    # ------------------------------------------------------------------
    # Positionsgroesse
    # ------------------------------------------------------------------
    def calc_position_size(self, entry: float, sl: float) -> float:
        """
        Berechnet die Kontraktanzahl basierend auf Risiko-% des freien Guthabens.
        """
        balance   = float(self.exchange.fetch_balance()["USDT"]["free"])
        risk_usdt = balance * (RISK_PERCENT / 100.0)
        sl_dist   = abs(entry - sl)
        if sl_dist <= 0:
            return 0.0

        # Nominal-Wert = Contracts * Contract-Size * Entry
        market       = self.exchange.market(SYMBOL)
        contract_sz  = float(market.get("contractSize", 1))
        # Risiko: contracts * contract_sz * sl_dist = risk_usdt  => OHNE Hebel
        # Mit Hebel wird Margin = Wert / Leverage, aber Risiko bleibt gleich
        contracts = risk_usdt / (contract_sz * sl_dist)

        min_amt   = float(market.get("limits", {}).get("amount", {}).get("min", 1))
        precision = int(market.get("precision", {}).get("amount", 0))
        contracts = max(min_amt, round(contracts, precision))
        return contracts

    # ------------------------------------------------------------------
    # Offene Position pruefen
    # ------------------------------------------------------------------
    def has_open_position(self) -> bool:
        positions = self.exchange.fetch_positions([SYMBOL])
        for p in positions:
            if abs(float(p.get("contracts") or 0)) > 0:
                return True
        return False

    # ------------------------------------------------------------------
    # Order platzieren
    # ------------------------------------------------------------------
    def _place_order(
        self,
        side:  str,
        size:  float,
        entry: float,
        sl:    float,
        tp:    float,
    ) -> Optional[dict]:
        try:
            self.exchange.set_leverage(LEVERAGE, SYMBOL)
            order = self.exchange.create_order(
                SYMBOL,
                "market",
                side,
                size,
                params={
                    "stopLoss":   {"triggerPrice": round(sl, 4), "type": "market"},
                    "takeProfit": {"triggerPrice": round(tp, 4), "type": "market"},
                },
            )
            return order
        except ccxt.ExchangeError as e:
            log.error("Order-Fehler (%s): %s", side.upper(), e)
            return None

    # ------------------------------------------------------------------
    # Hauptlogik: einmal pruefen
    # ------------------------------------------------------------------
    def run_once(self) -> None:
        if self.has_open_position():
            log.info("Position offen — kein neues Signal gesucht")
            return

        df = self._fetch_ohlcv(TIMEFRAME)
        bsl, ssl = self.find_swing_levels(df)
        log.info("Levels | BSL: %.4f | SSL: %.4f", bsl, ssl)

        # Letzte abgeschlossene Kerze (Index -2)
        last   = df.iloc[-2]
        h, l   = last["high"],  last["low"]
        c, o   = last["close"], last["open"]

        ticker = self.exchange.fetch_ticker(SYMBOL)
        price  = float(ticker["last"])

        htf_bias = self.get_htf_bias() if USE_HTF_FILTER else 0
        bias_str = {1: "bullisch", -1: "baerisch", 0: "neutral"}.get(htf_bias, "?")
        log.info("HTF Bias: %s | Preis: %.4f", bias_str, price)

        # ===== BSL Sweep -> SELL =====
        if TRADE_SELL and bsl > 0:
            if h > bsl and c < bsl and c < o:
                if not USE_HTF_FILTER or htf_bias <= 0:
                    sl   = h * (1 + SL_BUFFER_PCT)
                    tp   = price - abs(price - sl) * RR_RATIO
                    size = self.calc_position_size(price, sl)
                    if size > 0 and tp > 0:
                        log.info("[SELL] BSL Sweep %.4f | SL %.4f | TP %.4f | Groesse %s",
                                 bsl, sl, tp, size)
                        order = self._place_order("sell", size, price, sl, tp)
                        if order:
                            log.info("SELL Order OK | ID: %s", order.get("id"))

        # ===== SSL Sweep -> BUY =====
        if TRADE_BUY and ssl > 0:
            if l < ssl and c > ssl and c > o:
                if not USE_HTF_FILTER or htf_bias >= 0:
                    sl   = l * (1 - SL_BUFFER_PCT)
                    tp   = price + abs(price - sl) * RR_RATIO
                    size = self.calc_position_size(price, sl)
                    if size > 0:
                        log.info("[BUY] SSL Sweep %.4f | SL %.4f | TP %.4f | Groesse %s",
                                 ssl, sl, tp, size)
                        order = self._place_order("buy", size, price, sl, tp)
                        if order:
                            log.info("BUY Order OK | ID: %s", order.get("id"))

    # ------------------------------------------------------------------
    # Hauptschleife
    # ------------------------------------------------------------------
    def run(self) -> None:
        log.info("Hauptschleife gestartet | Pruefintervall: %ds", CHECK_INTERVAL_SEC)
        while True:
            try:
                self.run_once()
            except ccxt.NetworkError as exc:
                log.warning("Netzwerkfehler: %s", exc)
            except ccxt.ExchangeError as exc:
                log.error("Exchange-Fehler: %s", exc)
            except Exception as exc:  # noqa: BLE001
                log.exception("Unerwarteter Fehler: %s", exc)
            time.sleep(CHECK_INTERVAL_SEC)


if __name__ == "__main__":
    SmartMoneyBot().run()
