import { Panel } from "../components/Panel";
import { DataState, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtPct } from "../lib/format";

const SECTOR_LABEL: Record<string, string> = {
  technology: "Technology",
  financial_services: "Financial Services",
  communication_services: "Communication Svcs",
  consumer_cyclical: "Consumer Cyclical",
  consumer_defensive: "Consumer Defensive",
  healthcare: "Healthcare",
  industrials: "Industrials",
  energy: "Energy",
  utilities: "Utilities",
  basic_materials: "Basic Materials",
  real_estate: "Real Estate",
  realestate: "Real Estate",
};

function pct1(v: number | null | undefined): string {
  return v == null ? "—" : `${(v * 100).toFixed(2)}%`;
}

export function EtfView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.etf(symbol), 0, [symbol]);

  return (
    <Panel title={`ETF Analytics · ${symbol}`} subtitle="Holdings & exposure · Yahoo" error={!!error}
      className="h-full" bodyClassName="flex flex-col min-h-0">
      <DataState loading={loading} error={error} rows={12} cols={3}>
        {data && (!data.isEtf ? (
          <div className="p-6 text-2xs text-term-gray text-center">
            {data.name} ({symbol}) is not a fund/ETF — no holdings breakdown is published.
            Use DES, GP and FA for single-stock analytics.
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-2xs border-b border-term-border shrink-0">
              <Stat label="Category" value={data.category ?? "—"} valueClass="text-accent-amber" />
              <Stat label="Family" value={data.family ?? "—"} />
              <Stat label="Expense ratio" value={pct1(data.expenseRatio)} valueClass="text-accent-amber" />
              <Stat label="Net assets" value={data.netAssets == null ? "—" : `$${fmtCompact(data.netAssets)}`} />
              <Stat label="SEC yield" value={data.yield == null ? "—" : fmtPct(data.yield * 100)} />
              <Stat label="Type" value={data.legalType ?? "ETF"} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-term-border min-h-0 flex-1 overflow-hidden">
              <div className="bg-bg-panel flex flex-col min-h-0">
                <SectionHead title={`Top Holdings (${data.holdings.length})`} />
                <div className="flex-1 overflow-auto">
                  {data.holdings.length === 0 ? (
                    <div className="p-3 text-2xs text-term-gray">Holdings not disclosed for this fund.</div>
                  ) : (
                    <table className="w-full text-2xs">
                      <thead className="sticky top-0 bg-bg-header text-term-gray">
                        <tr>
                          <th className="px-3 py-1 text-left font-normal">Symbol</th>
                          <th className="px-3 py-1 text-left font-normal">Name</th>
                          <th className="px-3 py-1 text-right font-normal">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.holdings.map((h, i) => (
                          <tr key={i} className="border-b border-term-border/30 hover:bg-bg-secondary/40">
                            <td className="px-3 py-1 text-accent-amber font-mono">{h.symbol}</td>
                            <td className="px-3 py-1 text-term-white truncate max-w-[200px]">{h.name}</td>
                            <td className="px-3 py-1 text-right font-mono text-term-white">{pct1(h.weight)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="bg-bg-panel flex flex-col min-h-0 overflow-auto">
                <SectionHead title="Sector Weights" />
                <div className="p-3 space-y-1">
                  {data.sectors.length === 0 ? (
                    <div className="text-2xs text-term-gray">Sector breakdown not available (bond/commodity fund).</div>
                  ) : data.sectors.map((s) => (
                    <div key={s.sector} className="flex items-center gap-2">
                      <span className="text-2xs text-term-gray w-32 truncate">{SECTOR_LABEL[s.sector] ?? s.sector}</span>
                      <div className="flex-1 bg-bg-secondary h-3">
                        <div className="h-3 bg-accent-amber" style={{ width: `${Math.min(100, s.weight * 100)}%` }} />
                      </div>
                      <span className="text-2xs font-mono text-term-white w-12 text-right">{pct1(s.weight)}</span>
                    </div>
                  ))}
                </div>
                <SectionHead title="Asset Allocation" />
                <div className="p-3 space-y-1">
                  {(["stock", "bond", "cash", "preferred", "convertible", "other"] as const).map((k) => {
                    const v = data.allocation[k];
                    if (v == null || v === 0) return null;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-2xs text-term-gray w-32 capitalize">{k}</span>
                        <div className="flex-1 bg-bg-secondary h-3">
                          <div className="h-3 bg-term-green" style={{ width: `${Math.min(100, v * 100)}%` }} />
                        </div>
                        <span className="text-2xs font-mono text-term-white w-12 text-right">{pct1(v)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </DataState>
    </Panel>
  );
}

function Stat({ label, value, valueClass = "text-term-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-term-gray">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </span>
  );
}
