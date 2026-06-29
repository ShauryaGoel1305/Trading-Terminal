import { useMemo } from "react";
import { Panel } from "../components/Panel";
import { DataState, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtNum, fmtPct, fmtPrice } from "../lib/format";
import type { DividendsResponse } from "../types";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export function DividendsView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.dividends(symbol), 0, [symbol]);

  return (
    <Panel
      title={`Dividends & Splits · ${symbol}`}
      subtitle="Corporate actions · Yahoo"
      error={!!error}
      className="h-full"
      bodyClassName="flex flex-col min-h-0"
    >
      <DataState loading={loading} error={error} rows={12} cols={3}>
        {data && (
          <div className="flex flex-col min-h-0 flex-1">
            <Summary data={data} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-term-border min-h-0 flex-1 overflow-hidden">
              <div className="lg:col-span-2 bg-bg-panel flex flex-col min-h-0">
                <DividendTable data={data} />
              </div>
              <div className="bg-bg-panel flex flex-col min-h-0 overflow-auto">
                <SplitTable data={data} />
                <AnnualBars data={data} />
              </div>
            </div>
          </div>
        )}
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

function Summary({ data }: { data: DividendsResponse }) {
  const s = data.summary;
  const hasDiv = data.dividends.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-2xs border-b border-term-border shrink-0">
      {hasDiv ? (
        <>
          <Stat label="Indicated yield" value={s.dividendYield == null ? "—" : fmtPct(s.dividendYield * 100)} valueClass="text-accent-amber" />
          <Stat label="Annual rate" value={s.dividendRate == null ? "—" : `$${fmtNum(s.dividendRate)}`} valueClass="text-accent-amber" />
          <Stat label="TTM paid" value={s.ttmDividend == null ? "—" : `$${fmtNum(s.ttmDividend)}`} />
          <Stat label="Payout ratio" value={s.payoutRatio == null ? "—" : fmtPct(s.payoutRatio * 100)} />
          <Stat label="Ex-date" value={fmtDate(s.exDividendDate)} />
          <span className="text-term-border">│</span>
          <Stat label="1Y growth" value={s.growth1y == null ? "—" : fmtPct(s.growth1y)}
            valueClass={s.growth1y == null ? "" : s.growth1y >= 0 ? "text-term-green" : "text-term-red"} />
          <Stat label="5Y CAGR" value={s.cagr5y == null ? "—" : fmtPct(s.cagr5y)}
            valueClass={s.cagr5y == null ? "" : s.cagr5y >= 0 ? "text-term-green" : "text-term-red"} />
          <Stat label="Payments" value={String(s.totalDividends)} />
          <Stat label="Since" value={fmtDate(s.firstDividendDate)} />
          <Stat label="Splits" value={String(s.totalSplits)} />
        </>
      ) : (
        <>
          <Stat label="Dividends" value="None on record" valueClass="text-term-gray" />
          <Stat label="Splits" value={String(s.totalSplits)} />
          <span className="text-term-gray">— {data.companyName} has not paid a cash dividend in its trading history.</span>
        </>
      )}
    </div>
  );
}

function DividendTable({ data }: { data: DividendsResponse }) {
  // Pair each payment with the prior one for a QoQ/period change.
  const rows = useMemo(() => {
    const d = data.dividends;
    return d.map((cur, i) => {
      const prior = d[i + 1]; // next in newest-first array = older payment
      const chg = prior && prior.amount ? (cur.amount / prior.amount - 1) * 100 : null;
      return { ...cur, chg };
    });
  }, [data.dividends]);

  if (rows.length === 0) {
    return <div className="p-6 text-2xs text-term-gray text-center">No dividend payments on record.</div>;
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <SectionHead title={`Dividend History (${rows.length} payments)`} />
      <div className="flex-1 overflow-auto">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-bg-header text-term-gray">
            <tr>
              <th className="px-3 py-1 text-left font-normal">Ex-Date</th>
              <th className="px-3 py-1 text-right font-normal">Amount / sh</th>
              <th className="px-3 py-1 text-right font-normal">Δ vs prior</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-term-border/30 hover:bg-bg-secondary/40">
                <td className="px-3 py-1 text-term-white whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-3 py-1 text-right font-mono text-accent-amber">${fmtNum(r.amount, 4)}</td>
                <td className={`px-3 py-1 text-right font-mono ${r.chg == null ? "text-term-gray" : r.chg >= 0 ? "text-term-green" : "text-term-red"}`}>
                  {r.chg == null ? "—" : fmtPct(r.chg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SplitTable({ data }: { data: DividendsResponse }) {
  return (
    <div>
      <SectionHead title={`Stock Splits (${data.splits.length})`} />
      {data.splits.length === 0 ? (
        <div className="px-3 py-3 text-2xs text-term-gray">No stock splits on record.</div>
      ) : (
        <table className="w-full text-2xs">
          <thead className="text-term-gray">
            <tr>
              <th className="px-3 py-1 text-left font-normal">Date</th>
              <th className="px-3 py-1 text-right font-normal">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {data.splits.map((s, i) => {
              const fwd = s.numerator >= s.denominator;
              return (
                <tr key={i} className="border-b border-term-border/30">
                  <td className="px-3 py-1 text-term-white whitespace-nowrap">{fmtDate(s.date)}</td>
                  <td className={`px-3 py-1 text-right font-mono ${fwd ? "text-term-green" : "text-term-red"}`}>
                    {s.ratio}{fwd ? " ▲" : " ▼"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Compact annual-dividend bar chart (sum per calendar year, last ~12 complete years).
function AnnualBars({ data }: { data: DividendsResponse }) {
  const bars = useMemo(() => {
    const byYear = new Map<number, number>();
    for (const d of data.dividends) {
      const y = Number(d.date.slice(0, 4));
      byYear.set(y, (byYear.get(y) ?? 0) + d.amount);
    }
    return [...byYear.entries()].sort((a, b) => a[0] - b[0]).slice(-12);
  }, [data.dividends]);

  if (bars.length === 0) return null;
  const max = Math.max(...bars.map(([, v]) => v)) || 1;

  return (
    <div>
      <SectionHead title="Annual Dividend / Share" />
      <div className="p-3 space-y-1">
        {bars.map(([year, v]) => (
          <div key={year} className="flex items-center gap-2">
            <span className="text-2xs text-term-gray w-8">{year}</span>
            <div className="flex-1 bg-bg-secondary h-3">
              <div className="h-3 bg-accent-amber" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <span className="text-2xs font-mono text-term-white w-12 text-right">${fmtPrice(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
