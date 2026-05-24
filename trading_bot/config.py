"""
Konfiguration fuer den Smart Money Liquidity Sweep Bot.
Trage hier deine Bitget API-Daten ein.

API-Keys erstellen: Bitget -> Einstellungen -> API-Verwaltung
Benoetigt: Lesen + Handeln (KEIN Auszahlen!)
"""

# ================================================================
# BITGET API - HIER EINTRAGEN
# ================================================================
API_KEY        = "DEIN_API_KEY_HIER"       # z.B. "bg_abc123..."
API_SECRET     = "DEIN_API_SECRET_HIER"    # langer Secret-String
API_PASSPHRASE = "DEIN_PASSPHRASE_HIER"    # Passwort das du beim Erstellen vergeben hast

# ================================================================
# HANDELSINSTRUMENT
# ================================================================
SYMBOL         = "BTC/USDT:USDT"   # Perpetual Future (swap)
                                    # Andere Beispiele: "ETH/USDT:USDT", "SOL/USDT:USDT"
TIMEFRAME      = "15m"             # Einstiegs-Timeframe: 1m, 5m, 15m, 1h, 4h
HTF_TIMEFRAME  = "4h"              # Higher Timeframe fuer Trend-Bias

# ================================================================
# STRATEGIE-PARAMETER
# ================================================================
SWING_STRENGTH  = 3     # Bars je Seite fuer Swing-Erkennung (hoeher = staerkere Swings)
SWING_LOOKBACK  = 50    # Wie viele abgeschlossene Bars werden nach BSL/SSL durchsucht

RISK_PERCENT    = 1.0   # Risiko pro Trade in % des Kontoguthabens
RR_RATIO        = 2.0   # Risk:Reward Ratio (2.0 = 1:2 -> TP = 2x SL-Abstand)
SL_BUFFER_PCT   = 0.0005  # 0.05% Puffer ueber/unter dem Sweep-Wick fuer SL

LEVERAGE        = 5     # Hebel (VORSICHT: hoeher = mehr Risiko)

EMA_FAST        = 50    # EMA Periode fuer HTF-Filter
EMA_SLOW        = 200   # EMA Periode fuer HTF-Filter

# ================================================================
# SIGNALFILTER
# ================================================================
USE_HTF_FILTER  = True   # True = nur Trades in HTF-Trendrichtung
TRADE_BUY       = True   # SSL-Sweeps traden (Long)
TRADE_SELL      = True   # BSL-Sweeps traden (Short)

# ================================================================
# LAUFZEIT
# ================================================================
CHECK_INTERVAL_SEC = 60  # Pruefintervall in Sekunden (60 = jede Minute)
