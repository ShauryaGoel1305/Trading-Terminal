import { DataState, LiveIndicator } from "../components/ui";
import { useMarketData } from "../hooks/useMarketData";
import { fmtPrice, fmtPct, fmtChange, trendClass } from "../lib/format";

export interface MonitorItem {
  symbol: string;
  label: string;
}

// A simple ranked quote board used by WEI (indices) and FXC (currencies).
export function QuoteMonitor({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: MonitorItem[];
  onSelect?: (s: string) => void;
}) {
  const symbols = items.map((i) => i.symbol);
  const { data, loading, lastUpdated } = useMarketData(symbols, 30_000);
  const bySym = new Map((data ?? []).map((q) => [q.symbol, q]));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 py-1 bg-bg-header border-b border-term-border text-2xs">
        <span className="text-accent-amber font-semibold uppercase">{title}</span>
        <LiveIndicator lastUpdated={lastUpdated} staleAfter={90} />
      </div>
      <div className="flex-1 overflow-auto">
        <DataState loading={loading && !data} rows={items.length} cols={4}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-secondary text-2xs text-term-gray uppercase">
              <tr>
                <th className="text-left px-2 py-1">Name</th>
                <th className="text-right px-2 py-1">Last</th>
                <th className="text-right px-2 py-1">Net Chg</th>
                <th className="text-right px-2 py-1 w-20">% Chg</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const q = bySym.get(it.symbol);
                const cls = trendClass(q?.changePercent);
                return (
                  <tr
                    key={it.symbol}
                    onClick={() => onSelect?.(it.symbol)}
                    className={`border-b border-term-border/30 ${onSelect ? "cursor-pointer hover:bg-bg-secondary" : ""}`}
                  >
                    <td className="px-2 py-1">
                      <span className="text-term-white">{it.label}</span>
                      <span className="text-term-gray ml-2">{it.symbol}</span>
                    </td>
                    <td className="num px-2 py-1 text-term-white">{q && !q.error ? fmtPrice(q.price) : "—"}</td>
                    <td className={`num px-2 py-1 ${cls}`}>{q && !q.error ? fmtChange(q.change) : ""}</td>
                    <td className={`num px-2 py-1 w-20 ${cls}`}>{q && !q.error ? fmtPct(q.changePercent) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataState>
      </div>
    </div>
  );
}
