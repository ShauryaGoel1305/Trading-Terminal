import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtNum, fmtPct, trendClass } from "../lib/format";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function Sparkbars({ points, format }: { points: { date: string; value: number }[]; format: (v: number) => string }) {
  const rows = points.slice(-16);
  const max = Math.max(...rows.map((p) => Math.abs(p.value))) || 1;
  return (
    <div className="p-2 space-y-1">
      {rows.map((p) => (
        <div key={p.date} className="flex items-center gap-2">
          <span className="text-2xs text-term-gray w-16">{fmtDate(p.date)}</span>
          <div className="flex-1 bg-bg-secondary h-3">
            <div className="h-3 bg-accent-amber" style={{ width: `${(Math.abs(p.value) / max) * 100}%` }} />
          </div>
          <span className="text-2xs font-mono text-term-white w-16 text-right">{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function GdpTab() {
  const { data, loading, error } = usePolling(() => api.gdp(), 0, []);
  const latest = data?.real[data.real.length - 1];
  return (
    <DataState loading={loading} error={error} rows={10} cols={2}>
      {data && latest && (
        <div>
          <SectionHead title="Real GDP (chained 2017 $bn, quarterly) — FRED: GDPC1" />
          <Metric label="Latest Quarter" value={fmtDate(latest.date)} />
          <Metric label="Real GDP" value={`$${fmtNum(latest.value, 0)}bn`} />
          <Metric label="QoQ Annualized" value={latest.qoqAnnualized == null ? "—" : fmtPct(latest.qoqAnnualized)} valueClass={trendClass(latest.qoqAnnualized)} />
          <Metric label="YoY Growth" value={latest.yoy == null ? "—" : fmtPct(latest.yoy)} valueClass={trendClass(latest.yoy)} />
          <SectionHead title="QoQ Annualized Growth Rate — last 16 quarters" />
          <Sparkbars points={data.real.map((p) => ({ date: p.date, value: p.qoqAnnualized ?? 0 }))} format={(v) => fmtPct(v)} />
        </div>
      )}
    </DataState>
  );
}

function CpiTab() {
  const { data, loading, error } = usePolling(() => api.cpi(), 0, []);
  const latest = data?.series[data.series.length - 1];
  return (
    <DataState loading={loading} error={error} rows={10} cols={2}>
      {data && latest && (
        <div>
          <SectionHead title="Consumer Price Index — FRED: CPIAUCSL" />
          <Metric label="Latest Month" value={fmtDate(latest.date)} />
          <Metric label="CPI Index Level" value={fmtNum(latest.value)} />
          <Metric label="YoY Inflation" value={latest.yoy == null ? "—" : fmtPct(latest.yoy)} valueClass={trendClass(latest.yoy)} />
          <SectionHead title="YoY Inflation Rate — last 16 months" />
          <Sparkbars points={data.series.map((p) => ({ date: p.date, value: p.yoy ?? 0 }))} format={(v) => fmtPct(v)} />
        </div>
      )}
    </DataState>
  );
}

function FomcTab() {
  const { data, loading, error } = usePolling(() => api.fomc(), 0, []);
  return (
    <DataState loading={loading} error={error} rows={10} cols={2}>
      {data && (
        <div>
          <SectionHead title="Effective Federal Funds Rate — FRED: FEDFUNDS" />
          <Metric label="Latest Month" value={fmtDate(data.latestDate)} />
          <Metric label="Effective Rate" value={data.latest == null ? "—" : fmtPct(data.latest)} valueClass="text-accent-amber" />
          <Metric
            label="Change vs Prior Month"
            value={data.changeVsPriorMonth == null ? "—" : `${data.changeVsPriorMonth >= 0 ? "+" : ""}${fmtNum(data.changeVsPriorMonth * 100, 0)}bp`}
            valueClass={trendClass(data.changeVsPriorMonth)}
          />
          <p className="px-2 py-2 text-2xs text-term-gray leading-relaxed">
            The Fed doesn't publish a single continuous "next meeting rate" feed for free — this tracks the realized
            effective rate, which moves in step with FOMC decisions. See the ECO calendar for scheduled FOMC dates.
          </p>
          <SectionHead title="Rate History — last 15 years" />
          <Sparkbars points={data.series} format={(v) => fmtPct(v)} />
        </div>
      )}
    </DataState>
  );
}

function CenbTab() {
  const { data, loading, error } = usePolling(() => api.cenb(), 0, []);
  return (
    <DataState loading={loading} error={error} rows={6} cols={4}>
      {data && (
        <div>
          <SectionHead title="Major Central Bank Policy Rates" />
          <table className="w-full text-2xs">
            <thead>
              <tr className="text-term-gray">
                <th className="px-2 py-1 text-left font-normal">Central Bank</th>
                <th className="px-2 py-1 text-left font-normal">Series Used</th>
                <th className="num px-2 py-1 font-normal">Rate</th>
                <th className="px-2 py-1 text-left font-normal">As Of</th>
              </tr>
            </thead>
            <tbody>
              {data.banks.map((b) => (
                <tr key={b.bank} className="border-b border-term-border/30">
                  <td className="px-2 py-1 text-term-white">{b.bank}</td>
                  <td className="px-2 py-1 text-term-gray">
                    {b.proxy}
                    {!b.exact && <span className="text-accent-amber ml-1" title="Tracks the policy rate closely but is not the official announced rate itself">(proxy)</span>}
                  </td>
                  <td className="num px-2 py-1 text-accent-amber">{b.latest ? fmtPct(b.latest.value) : "—"}</td>
                  <td className="px-2 py-1 text-term-gray">{fmtDate(b.latest?.date ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-2 py-2 text-2xs text-term-gray leading-relaxed">
            Source: FRED (Federal Reserve Economic Data). Bank of England and Bank of Japan don't have a
            continuously-updated official policy rate series on FRED, so the closest tracked market rate is shown
            instead of the announced rate.
          </p>
        </div>
      )}
    </DataState>
  );
}

const SERIES = {
  gdp: { title: "GDP · Real & Nominal Growth", Tab: GdpTab },
  cpi: { title: "CPI · Inflation", Tab: CpiTab },
  fomc: { title: "FOMC · Fed Funds Rate", Tab: FomcTab },
  cenb: { title: "Central Banks · Policy Rates", Tab: CenbTab },
} as const;

// GDP, CPI, FOMC and CENB are macro/market-wide (not security-specific) —
// each renders a genuinely different FRED series, sharing only this shell.
export function MacroView({ series }: { series: keyof typeof SERIES }) {
  const { title, Tab } = SERIES[series];
  return (
    <Panel title={title} subtitle="FRED · Federal Reserve Economic Data" className="h-full" bodyClassName="overflow-auto">
      <Tab />
    </Panel>
  );
}
