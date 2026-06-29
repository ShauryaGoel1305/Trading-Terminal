import { Panel } from "../components/Panel";
import { DataState } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice, trendClass } from "../lib/format";

export function PeersView({ symbol, onSelect }: { symbol: string; onSelect: (s: string) => void }) {
  const { data, loading, error } = usePolling(() => api.peers(symbol), 60_000, [symbol]);

  return (
    <Panel title={`Relative Valuation · ${symbol}`} subtitle="Peers" error={!!error}>
      <DataState loading={loading} error={error} empty={!!data && data.peers.length <= 1} rows={8} cols={6}>
        {data && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-header text-term-gray text-2xs uppercase">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Symbol</th>
                <th className="px-2 py-1 text-left font-normal">Name</th>
                <th className="num px-2 py-1 font-normal">Last</th>
                <th className="num px-2 py-1 font-normal">Chg%</th>
                <th className="num px-2 py-1 font-normal">Mkt Cap</th>
                <th className="num px-2 py-1 font-normal">P/E</th>
                <th className="num px-2 py-1 font-normal">Fwd P/E</th>
                <th className="num px-2 py-1 font-normal">P/B</th>
              </tr>
            </thead>
            <tbody>
              {data.peers.map((p) => (
                <tr
                  key={p.symbol}
                  onClick={() => onSelect(p.symbol)}
                  className={`border-b border-term-border/30 cursor-pointer hover:bg-bg-secondary ${
                    p.isBase ? "bg-bg-header" : ""
                  }`}
                >
                  <td className={`px-2 py-1 font-semibold ${p.isBase ? "text-accent-orange" : "text-term-white"}`}>{p.symbol}</td>
                  <td className="px-2 py-1 text-term-gray truncate max-w-[160px]">{p.name}</td>
                  <td className="num px-2 py-1 text-term-white">{fmtPrice(p.price)}</td>
                  <td className={`num px-2 py-1 ${trendClass(p.changePercent)}`}>{fmtPct(p.changePercent)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtCompact(p.marketCap)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtNum(p.trailingPE)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtNum(p.forwardPE)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtNum(p.priceToBook)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataState>
    </Panel>
  );
}
