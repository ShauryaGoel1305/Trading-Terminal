import { QuoteMonitor, type MonitorItem } from "./QuoteMonitorView";

// World equity indices (WEI). Yahoo index symbols.
const INDICES: MonitorItem[] = [
  { symbol: "^GSPC", label: "S&P 500 (US)" },
  { symbol: "^DJI", label: "Dow Jones (US)" },
  { symbol: "^IXIC", label: "Nasdaq Comp (US)" },
  { symbol: "^RUT", label: "Russell 2000 (US)" },
  { symbol: "^VIX", label: "CBOE VIX" },
  { symbol: "^FTSE", label: "FTSE 100 (UK)" },
  { symbol: "^GDAXI", label: "DAX (DE)" },
  { symbol: "^FCHI", label: "CAC 40 (FR)" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50" },
  { symbol: "^N225", label: "Nikkei 225 (JP)" },
  { symbol: "^HSI", label: "Hang Seng (HK)" },
  { symbol: "000001.SS", label: "Shanghai Comp (CN)" },
  { symbol: "^BSESN", label: "Sensex (IN)" },
  { symbol: "^AXJO", label: "ASX 200 (AU)" },
  { symbol: "^GSPTSE", label: "S&P/TSX (CA)" },
  { symbol: "^BVSP", label: "Bovespa (BR)" },
  { symbol: "^KS11", label: "KOSPI (KR)" },
  { symbol: "^MXX", label: "IPC (MX)" },
];

export function IndicesView() {
  return <QuoteMonitor title="World Equity Indices · WEI" items={INDICES} />;
}
