import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtPct, trendClass } from "../lib/format";

export function OwnershipView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.ownership(symbol), 0, [symbol]);
  const b = data?.breakdown;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-px bg-term-border overflow-auto">
      <Panel title={`Ownership · ${symbol}`} error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} rows={6} cols={2}>
          {data && b && (
            <div>
              <SectionHead title="Breakdown" />
              <Metric label="% Held by Institutions" value={b.institutionsPercentHeld == null ? "—" : fmtPct(b.institutionsPercentHeld * 100)} />
              <Metric label="% of Float (Inst.)" value={b.institutionsFloatPercentHeld == null ? "—" : fmtPct(b.institutionsFloatPercentHeld * 100)} />
              <Metric label="% Held by Insiders" value={b.insidersPercentHeld == null ? "—" : fmtPct(b.insidersPercentHeld * 100)} />
              <Metric label="# of Institutions" value={b.institutionsCount == null ? "—" : fmtCompact(b.institutionsCount)} />

              <SectionHead title="Top Institutional Holders" />
              <table className="w-full text-2xs">
                <thead>
                  <tr className="text-term-gray">
                    <th className="px-2 py-1 text-left font-normal">Holder</th>
                    <th className="num px-2 py-1 font-normal">% Held</th>
                    <th className="num px-2 py-1 font-normal">Value</th>
                    <th className="num px-2 py-1 font-normal">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.institutions.map((o, i) => (
                    <tr key={i} className="border-b border-term-border/30">
                      <td className="px-2 py-1 text-term-white truncate max-w-[120px]" title={o.organization}>{o.organization}</td>
                      <td className="num px-2 py-1 text-term-gray">{fmtPct(o.pctHeld * 100)}</td>
                      <td className="num px-2 py-1 text-term-gray">{fmtCompact(o.value)}</td>
                      <td className={`num px-2 py-1 ${trendClass(o.pctChange)}`}>
                        {o.pctChange == null ? "—" : fmtPct(o.pctChange * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </Panel>

      <Panel title="Insider Transactions" error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} empty={!!data && data.insiders.length === 0} rows={10} cols={3}>
          {data && (
            <table className="w-full text-2xs">
              <thead className="sticky top-0 bg-bg-header text-term-gray">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Insider</th>
                  <th className="px-2 py-1 text-left font-normal">Transaction</th>
                  <th className="num px-2 py-1 font-normal">Shares</th>
                  <th className="num px-2 py-1 font-normal">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.insiders.map((t, i) => (
                  <tr key={i} className="border-b border-term-border/30">
                    <td className="px-2 py-1">
                      <div className="text-term-white truncate max-w-[120px]">{t.name}</div>
                      <div className="text-term-gray">{t.relation}</div>
                    </td>
                    <td className="px-2 py-1 text-term-gray truncate max-w-[160px]" title={t.text}>{t.text}</td>
                    <td className="num px-2 py-1 text-term-white">{fmtCompact(t.shares)}</td>
                    <td className="num px-2 py-1 text-term-gray">{t.value ? fmtCompact(t.value) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataState>
      </Panel>
    </div>
  );
}
