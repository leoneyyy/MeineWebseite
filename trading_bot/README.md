# Smart Money Liquidity Sweep Trading Bot

Automatischer Trading Bot basierend auf der Smart Money Liquidity Sweep Strategie.

## Strategie-Logik

**BSL (Buy Side Liquidity)** = Swing Highs — dort liegen die Stop-Losses der Short-Trader.  
**SSL (Sell Side Liquidity)** = Swing Lows — dort liegen die Stop-Losses der Long-Trader.

### Signal-Bedingungen

| Signal | Bedingung |
|--------|-----------|
| **SELL** | Kerze wick-t über BSL hinaus, schließt aber *darunter* (Ablehnung) + bearische Kerze |
| **BUY** | Kerze wick-t unter SSL hinaus, schließt aber *darüber* (Ablehnung) + bullische Kerze |

Optional: HTF-Filter (EMA 50 vs 200) filtert gegen-Trend Trades heraus.

---

## MetaTrader 5 Expert Advisor

### Installation
1. `SmartMoney_LiquiditySweep.mq5` nach `MQL5/Experts/` kopieren
2. In MT5: F5 drücken (kompilieren) → kein Fehler sollte erscheinen
3. EA auf Chart ziehen → Parameter einstellen → Autotrading aktivieren

### Parameter

| Parameter | Standard | Beschreibung |
|-----------|----------|--------------|
| InpSwingStrength | 3 | Bars je Seite für Swing-Erkennung |
| InpSwingLookback | 50 | Suchfenster für BSL/SSL |
| InpRiskPercent | 1.0 | Risiko pro Trade (% Konto) |
| InpRRRatio | 2.0 | Risk:Reward Ratio |
| InpUseHTFFilter | true | HTF Trend-Filter |
| InpHTF | H4 | Higher Timeframe |

---

## Bitget Python Bot

### Setup
```bash
pip install -r requirements.txt
```

### API-Keys eintragen
`config.py` öffnen und eintragen:
```python
API_KEY        = "dein-api-key"
API_SECRET     = "dein-secret"
API_PASSPHRASE = "dein-passphrase"
```
> API bei Bitget erstellen: Einstellungen → API-Verwaltung  
> Berechtigungen: **Lesen + Handeln** (KEIN Auszahlen)

### Starten
```bash
python bitget_sm_bot.py
```

Logs werden in `sm_bot.log` gespeichert und gleichzeitig in der Konsole angezeigt.

### Parameter anpassen
Alle Einstellungen in `config.py`:

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| SYMBOL | BTC/USDT:USDT | Handelspaar (Perpetual Swap) |
| TIMEFRAME | 15m | Einstiegs-Timeframe |
| HTF_TIMEFRAME | 4h | Bias-Timeframe |
| SWING_STRENGTH | 3 | Swing-Erkennung Stärke |
| RISK_PERCENT | 1.0 | Risiko pro Trade (%) |
| RR_RATIO | 2.0 | Risk:Reward Ratio |
| LEVERAGE | 5 | Hebel |
| USE_HTF_FILTER | True | Nur Trend-konforme Trades |

---

## Wichtiger Hinweis

Diesen Bot **immer zuerst im Demo/Testnet** testen, bevor du echtes Kapital einsetzt.  
Bitget Testnet: https://testnet.bitget.com  
Algorithmisches Trading birgt Risiken — vergangene Performance garantiert keine zukünftigen Ergebnisse.
