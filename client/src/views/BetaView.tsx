import { Panel } from "../components/Panel";
import { DataState, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtNum } from "../lib/format";

function betaClass(b: number | null): string {
  if (b == null) return "text-term-gray";
  if (b > 1.15) return "text-term-red";    // more volatile than market
  if (b < 0.85) return "text-term-green";  // less volatile than market
  return "text-term-white";
}

export function BetaView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.beta(symbol), 0, [symbol]);

  return (
    <Panel title={`Beta & Correlation · ${symbol}`} subtitle="vs major benchmarks" error={!!error}
      className="h-full" bodyClassName="flex flex-col min-h-0">
      <DataState loading={loading} error={error} rows={6} cols={5}>
        {data && (
          <div className="flex flex-col min-h-0 flex-1 overflow-auto">
            <SectionHead title={`Regression of ${symbol} daily returns on each benchmark (${data.observations1y} obs, 1yr)`} />
            <table className="w-full text-2xs">
              <thead className="text-term-gray">
                <tr>
                  <th className="px-3 py-1.5 text-left font-normal">Benchmark</th>
                  <th className="px-3 py-1.5 text-right font-normal">β (1Y)</th>
                  <th className="px-3 py-1.5 text-right font-normal">Corr (1Y)</th>
                  <th className="px-3 py-1.5 text-right font-normal">R² (1Y)</th>
                  <th className="px-3 py-1.5 text-right font-normal">β (3Y)</th>
                  <th className="px-3 py-1.5 text-right font-normal">Corr (3Y)</th>
                </tr>
              </thead>
              <tbody>
                {data.benchmarks.map((b) => (
                  <tr key={b.symbol} className="border-b border-term-border/30 hover:bg-bg-secondary/40">
                    <td className="px-3 py-1.5 text-term-white">
                      <span className="text-accent-amber font-mono">{b.symbol}</span>
                      <span className="text-term-gray ml-2">{b.label}</span>
                    </td>
                    <td className={`px-3 py-1.5 text-right font-mono ${betaClass(b.beta1y)}`}>{fmtNum(b.beta1y)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-term-white">{fmtNum(b.corr1y)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-term-gray">{b.r2_1y == null ? "—" : (b.r2_1y * 100).toFixed(0) + "%"}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${betaClass(b.beta3y)}`}>{fmtNum(b.beta3y)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-term-white">{fmtNum(b.corr3y)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 text-2xs text-term-gray leading-relaxed border-t border-term-border mt-1">
              <span className="text-term-white">β</span> measures sensitivity to the benchmark's moves (β=1 moves in line,
              β&gt;1 amplifies, β&lt;1 dampens). <span className="text-term-white">Correlation</span> is the strength of
              the relationship and <span className="text-term-white">R²</span> the share of the stock's variance explained
              by the benchmark. Computed from daily log returns over the trailing 1- and 3-year windows.
              <span className="text-term-green"> Green</span> = defensive (β&lt;0.85),
              <span className="text-term-red"> red</span> = aggressive (β&gt;1.15). Source: Yahoo daily closes.
            </div>
          </div>
        )}
      </DataState>
    </Panel>
  );
}
