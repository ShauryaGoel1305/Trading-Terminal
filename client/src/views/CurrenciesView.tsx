import { QuoteMonitor, type MonitorItem } from "./QuoteMonitorView";

// Currency monitor (FXC / WCRS). Yahoo FX pair symbols.
const PAIRS: MonitorItem[] = [
  { symbol: "DX-Y.NYB", label: "US Dollar Index" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "GBPUSD=X", label: "GBP/USD" },
  { symbol: "JPY=X", label: "USD/JPY" },
  { symbol: "USDCHF=X", label: "USD/CHF" },
  { symbol: "AUDUSD=X", label: "AUD/USD" },
  { symbol: "NZDUSD=X", label: "NZD/USD" },
  { symbol: "USDCAD=X", label: "USD/CAD" },
  { symbol: "EURGBP=X", label: "EUR/GBP" },
  { symbol: "EURJPY=X", label: "EUR/JPY" },
  { symbol: "CNY=X", label: "USD/CNY" },
  { symbol: "MXN=X", label: "USD/MXN" },
  { symbol: "INR=X", label: "USD/INR" },
  { symbol: "BTC-USD", label: "Bitcoin / USD" },
];

export function CurrenciesView() {
  return <QuoteMonitor title="Currency Monitor · FXC" items={PAIRS} />;
}
