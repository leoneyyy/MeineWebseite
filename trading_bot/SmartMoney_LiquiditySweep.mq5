//+------------------------------------------------------------------+
//|               SmartMoney_LiquiditySweep.mq5                     |
//|   Smart Money Liquidity Sweep Strategy fuer MetaTrader 5         |
//|   Strategie: BSL/SSL Sweep Detection + Reversal Entry            |
//+------------------------------------------------------------------+
#property copyright "Leon"
#property version   "1.00"
#property description "Smart Money Liquidity Sweep EA\nHandelt BSL/SSL Sweeps mit Reversal-Entries"

#include <Trade\Trade.mqh>

//--- Eingabeparameter
input group "=== Swing Detection ==="
input int    InpSwingStrength  = 3;        // Bars je Seite fuer Swing-Erkennung
input int    InpSwingLookback  = 50;       // Suchfenster (Bars) fuer BSL/SSL

input group "=== Trade Management ==="
input double InpRiskPercent    = 1.0;      // Risiko pro Trade (% des Kontos)
input double InpRRRatio        = 2.0;      // Risk:Reward Ratio
input int    InpSLBufferPts    = 5;        // Puffer fuer SL in Points
input bool   InpTradeBuy       = true;     // SSL-Sweeps traden (Buy)
input bool   InpTradeSell      = true;     // BSL-Sweeps traden (Sell)

input group "=== HTF Trend-Filter ==="
input bool             InpUseHTFFilter = true;       // HTF-Filter aktiv
input ENUM_TIMEFRAMES  InpHTF          = PERIOD_H4;  // Higher Timeframe
input int              InpEMAFast      = 50;         // EMA Fast Periode
input int              InpEMASlow      = 200;        // EMA Slow Periode

input group "=== Allgemein ==="
input int    InpMagic   = 20250001;
input string InpComment = "SM_LiqSweep";

//--- Globale Variablen
CTrade trade;
ulong  g_posTicket = 0;
int    g_hEMAFast  = INVALID_HANDLE;
int    g_hEMASlow  = INVALID_HANDLE;

//+------------------------------------------------------------------+
int OnInit()
{
    trade.SetExpertMagicNumber(InpMagic);
    trade.SetDeviationInPoints(20);

    if(InpUseHTFFilter)
    {
        g_hEMAFast = iMA(_Symbol, InpHTF, InpEMAFast,  0, MODE_EMA, PRICE_CLOSE);
        g_hEMASlow = iMA(_Symbol, InpHTF, InpEMASlow, 0, MODE_EMA, PRICE_CLOSE);
        if(g_hEMAFast == INVALID_HANDLE || g_hEMASlow == INVALID_HANDLE)
        {
            Print("Fehler beim Erstellen der EMA-Indikatoren");
            return INIT_FAILED;
        }
    }

    Print("SmartMoney LiquiditySweep EA gestartet | Symbol: ", _Symbol,
          " | Swing Strength: ", InpSwingStrength,
          " | Lookback: ",      InpSwingLookback);
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    if(g_hEMAFast != INVALID_HANDLE) IndicatorRelease(g_hEMAFast);
    if(g_hEMASlow != INVALID_HANDLE) IndicatorRelease(g_hEMASlow);
}

//+------------------------------------------------------------------+
void OnTick()
{
    // Nur auf neuer abgeschlossener Kerze reagieren
    static datetime s_lastBar = 0;
    datetime currentBar = iTime(_Symbol, PERIOD_CURRENT, 0);
    if(currentBar == s_lastBar) return;
    s_lastBar = currentBar;

    // Keine neue Position wenn bereits eine offen
    if(HasOpenPosition()) return;

    // Swing-Level finden
    double bslLevel = 0, sslLevel = 0;
    FindSwingLevels(bslLevel, sslLevel);
    if(bslLevel <= 0 && sslLevel <= 0) return;

    // Letzte abgeschlossene Kerze [1]
    double high1  = iHigh (_Symbol, PERIOD_CURRENT, 1);
    double low1   = iLow  (_Symbol, PERIOD_CURRENT, 1);
    double close1 = iClose(_Symbol, PERIOD_CURRENT, 1);
    double open1  = iOpen (_Symbol, PERIOD_CURRENT, 1);

    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    int    htf = GetHTFBias();

    // ===== BSL Sweep -> SELL =====
    // Wick ueber BSL, Close darunter (Ablehnung) + bearische Kerze
    if(InpTradeSell && bslLevel > 0)
    {
        bool swept       = (high1 > bslLevel);
        bool closedBelow = (close1 < bslLevel);
        bool bearCandle  = (close1 < open1);

        if(swept && closedBelow && bearCandle)
        {
            if(!InpUseHTFFilter || htf <= 0)
            {
                double sl   = high1 + InpSLBufferPts * _Point;
                double dist = MathAbs(bid - sl);
                double tp   = bid - dist * InpRRRatio;
                double lots = CalcLotSize(dist);

                if(lots > 0 && tp > 0)
                {
                    if(trade.Sell(lots, _Symbol, bid, sl, tp, InpComment + "_SELL"))
                    {
                        g_posTicket = trade.ResultOrder();
                        PrintFormat("[SELL] BSL Sweep bei %.5f | Entry: %.5f | SL: %.5f | TP: %.5f | Lots: %.2f",
                                    bslLevel, bid, sl, tp, lots);
                    }
                    else
                        Print("Sell-Order fehlgeschlagen: ", trade.ResultRetcodeDescription());
                }
            }
        }
    }

    // ===== SSL Sweep -> BUY =====
    // Wick unter SSL, Close darueber (Ablehnung) + bullische Kerze
    if(InpTradeBuy && sslLevel > 0)
    {
        bool swept       = (low1 < sslLevel);
        bool closedAbove = (close1 > sslLevel);
        bool bullCandle  = (close1 > open1);

        if(swept && closedAbove && bullCandle)
        {
            if(!InpUseHTFFilter || htf >= 0)
            {
                double sl   = low1 - InpSLBufferPts * _Point;
                double dist = MathAbs(ask - sl);
                double tp   = ask + dist * InpRRRatio;
                double lots = CalcLotSize(dist);

                if(lots > 0)
                {
                    if(trade.Buy(lots, _Symbol, ask, sl, tp, InpComment + "_BUY"))
                    {
                        g_posTicket = trade.ResultOrder();
                        PrintFormat("[BUY] SSL Sweep bei %.5f | Entry: %.5f | SL: %.5f | TP: %.5f | Lots: %.2f",
                                    sslLevel, ask, sl, tp, lots);
                    }
                    else
                        Print("Buy-Order fehlgeschlagen: ", trade.ResultRetcodeDescription());
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
// Sucht den hoechsten Swing High (BSL) und tiefsten Swing Low (SSL)
// im definierten Lookback-Fenster
//+------------------------------------------------------------------+
void FindSwingLevels(double &bsl, double &ssl)
{
    bsl = 0.0;
    ssl = DBL_MAX;
    int str = InpSwingStrength;
    int end = InpSwingLookback;

    for(int i = str + 1; i < end - str; i++)
    {
        double hi = iHigh(_Symbol, PERIOD_CURRENT, i);
        double lo = iLow (_Symbol, PERIOD_CURRENT, i);

        // Swing High: alle Nachbarn links und rechts kleiner
        bool isHigh = true;
        for(int j = 1; j <= str && isHigh; j++)
        {
            if(iHigh(_Symbol, PERIOD_CURRENT, i - j) >= hi ||
               iHigh(_Symbol, PERIOD_CURRENT, i + j) >= hi)
                isHigh = false;
        }
        if(isHigh && hi > bsl) bsl = hi;

        // Swing Low: alle Nachbarn links und rechts groesser
        bool isLow = true;
        for(int j = 1; j <= str && isLow; j++)
        {
            if(iLow(_Symbol, PERIOD_CURRENT, i - j) <= lo ||
               iLow(_Symbol, PERIOD_CURRENT, i + j) <= lo)
                isLow = false;
        }
        if(isLow && lo < ssl) ssl = lo;
    }

    if(ssl == DBL_MAX) ssl = 0.0;
}

//+------------------------------------------------------------------+
// HTF Bias via EMA-Kreuzung: +1 bullisch, -1 baerisch, 0 neutral
//+------------------------------------------------------------------+
int GetHTFBias()
{
    if(!InpUseHTFFilter) return 0;
    if(g_hEMAFast == INVALID_HANDLE || g_hEMASlow == INVALID_HANDLE) return 0;

    double fast[], slow_buf[];
    ArraySetAsSeries(fast,     true);
    ArraySetAsSeries(slow_buf, true);
    if(CopyBuffer(g_hEMAFast, 0, 0, 1, fast)     < 1) return 0;
    if(CopyBuffer(g_hEMASlow, 0, 0, 1, slow_buf) < 1) return 0;

    if(fast[0] > slow_buf[0]) return  1;
    if(fast[0] < slow_buf[0]) return -1;
    return 0;
}

//+------------------------------------------------------------------+
// Lot-Groesse basierend auf Risiko-% und SL-Abstand
//+------------------------------------------------------------------+
double CalcLotSize(double slDist)
{
    if(slDist <= 0) return 0;

    double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskMoney = balance * InpRiskPercent / 100.0;
    double tickVal   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    double lotStep   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
    double minLot    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
    double maxLot    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);

    if(tickVal <= 0 || tickSize <= 0) return 0;

    double valuePerLot = (slDist / tickSize) * tickVal;
    if(valuePerLot <= 0) return 0;

    double lots = riskMoney / valuePerLot;
    lots = MathFloor(lots / lotStep) * lotStep;
    return MathMax(minLot, MathMin(maxLot, lots));
}

//+------------------------------------------------------------------+
// Prueft ob eine offene Position mit unserem Magic existiert
//+------------------------------------------------------------------+
bool HasOpenPosition()
{
    for(int i = 0; i < PositionsTotal(); i++)
    {
        if(PositionSelectByTicket(PositionGetTicket(i)))
        {
            if(PositionGetString(POSITION_SYMBOL) == _Symbol &&
               PositionGetInteger(POSITION_MAGIC) == InpMagic)
                return true;
        }
    }
    g_posTicket = 0;
    return false;
}
//+------------------------------------------------------------------+