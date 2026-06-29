import { Panel } from "../components/Panel";
import { DataState } from "../components/ui";
import { useMarketData } from "../hooks/useMarketData";
import { fmtPrice, fmtPct, fmtVolume, trendClass } from "../lib/format";
import type { Quote } from "../types";

const CLASSES: { title: string; items: { symbol: string; label: string }[] }[] = [
  {
    title: "Equity Index ETFs",
    items: [
      { symbol: "SPY", label: "S&P 500" },
      { symbol: "QQQ", label: "Nasdaq 100" },
      { symbol: "DIA", label: "Dow 30" },
      { symbol: "IWM", label: "Russell 2000" },
      { symbol: "VTI", label: "Total Mkt" },
      { symbol: "EFA", label: "EAFE Intl" },
      { symbol: "EEM", label: "Emerging Mkts" },
    ],
  },
  {
    title: "Sectors",
    items: [
      { symbol: "XLK", label: "Technology" },
      { symbol: "XLF", label: "Financials" },
      { symbol: "XLE", label: "Energy" },
      { symbol: "XLV", label: "Health Care" },
      { symbol: "XLY", label: "Cons. Disc." },
      { symbol: "XLI", label: "Industrials" },
      { symbol: "XLU", label: "Utilities" },
    ],
  },
  {
    title: "Fixed Income",
    items: [
      { symbol: "TLT", label: "20Y+ Treasury" },
      { symbol: "IEF", label: "7-10Y Treasury" },
      { symbol: "SHY", label: "1-3Y Treasury" },
      { symbol: "LQD", label: "IG Corp" },
      { symbol: "HYG", label: "High Yield" },
      { symbol: "TIP", label: "TIPS" },
      { symbol: "MUB", label: "Municipal" },
      { symbol: "AGG", label: "Agg Bond" },
    ],
  },
  {
    title: "Foreign Exchange",
    items: [
      { symbol: "EURUSD=X", label: "EUR/USD" },
      { symbol: "JPY=X", label: "USD/JPY" },
      { symbol: "GBPUSD=X", label: "GBP/USD" },
      { symbol: "AUDUSD=X", label: "AUD/USD" },
      { symbol: "USDCAD=X", label: "USD/CAD" },
      { symbol: "USDCHF=X", label: "USD/CHF" },
      { symbol: "CNY=X", label: "USD/CNY" },
    ],
  },
  {
    title: "Commodities & Futures",
    items: [
      { symbol: "CL=F", label: "WTI Crude" },
      { symbol: "BZ=F", label: "Brent" },
      { symbol: "NG=F", label: "Nat Gas" },
      { symbol: "GC=F", label: "Gold" },
      { symbol: "SI=F", label: "Silver" },
      { symbol: "HG=F", label: "Copper" },
      { symbol: "ZC=F", label: "Corn" },
      { symbol: "ZW=F", label: "Wheat" },
    ],
  },
  {
    title: "Digital Assets",
    items: [
      { symbol: "BTC-USD", label: "Bitcoin" },
      { symbol: "ETH-USD", label: "Ethereum" },
      { symbol: "SOL-USD", label: "Solana" },
      { symbol: "XRP-USD", label: "XRP" },
      { symbol: "DOGE-USD", label: "Dogecoin" },
      { symbol: "ADA-USD", label: "Cardano" },
    ],
  },
];

function MonitorBlock({
  title,
  items,
  bySym,
  loading,
  onSelect,
}: {
  title: string;
  items: { symbol: string; label: string }[];
  bySym: Map<string, Quote>;
  loading: boolean;
  onSelect: (s: string) => void;
}) {
  return (
    <Panel title={title} className="min-h-0">
      <DataState loading={loading} rows={items.length} cols={3}>
        <table className="w-full text-2xs">
          <tbody>
            {items.map((it) => {
              const q = bySym.get(it.symbol);
              const cls = trendClass(q?.changePercent);
              return (
                <tr
                  key={it.symbol}
                  onClick={() => onSelect(it.symbol)}
                  className="border-b border-term-border/30 cursor-pointer hover:bg-bg-secondary"
                >
                  <td className="px-2 py-1">
                    <span className="text-term-white">{it.label}</span>
                    <span className="text-term-gray ml-1">{it.symbol}</span>
                  </td>
                  <td className="num px-2 py-1 text-term-white">{q && !q.error ? fmtPrice(q.price) : "—"}</td>
                  <td className={`num px-2 py-1 w-16 ${cls}`}>{q && !q.error ? fmtPct(q.changePercent) : ""}</td>
                  <td className="num px-2 py-1 text-term-gray hidden xl:table-cell">{q && !q.error ? fmtVolume(q.volume) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataState>
    </Panel>
  );
}

export function MarketsView({ onSelect }: { onSelect: (s: string) => void }) {
  const allSymbols = CLASSES.flatMap((c) => c.items.map((i) => i.symbol));
  const { data, loading } = useMarketData(allSymbols, 30_000);
  const bySym = new Map((data ?? []).map((q) => [q.symbol, q]));

  return (
    <div className="h-full overflow-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-term-border auto-rows-min">
      {CLASSES.map((c) => (
        <MonitorBlock
          key={c.title}
          title={c.title}
          items={c.items}
          bySym={bySym}
          loading={loading && !data}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
