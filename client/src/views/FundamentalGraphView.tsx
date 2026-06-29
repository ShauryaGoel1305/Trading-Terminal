import { useMemo } from "react";
import { Panel } from "../components/Panel";
import { DataState, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact } from "../lib/format";

function lineValues(stmt: { key: string; label: string; values: (number | null)[] }[], key: string): (number | null)[] {
  return stmt.find((l) => l.key === key)?.values ?? [];
}

type Unit = "money" | "eps" | "pct";

function fmtVal(v: number, unit: Unit): string {
  if (unit === "money") return fmtCompact(v);
  if (unit === "eps") return `$${v.toFixed(2)}`;
  return `${v.toFixed(1)}%`;
}

// One labelled bar chart across periods. Handles negatives.
function BarChart({ title, periods, values, unit }: {
  title: string; periods: string[]; values: (number | null)[]; unit: Unit;
}) {
  const max = Math.max(1, ...values.map((v) => Math.abs(v ?? 0)));
  return (
    <div className="bg-bg-panel p-2">
      <div className="text-2xs text-term-gray uppercase tracking-wider mb-1.5">{title}</div>
      <div className="flex items-end gap-1 h-24">
        {values.map((v, i) => {
          const h = v == null ? 0 : (Math.abs(v) / max) * 100;
          const neg = (v ?? 0) < 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[8px] font-mono text-term-white mb-0.5 whitespace-nowrap">
                {v == null ? "—" : fmtVal(v, unit)}
              </span>
              <div className={`w-full ${neg ? "bg-term-red" : "bg-accent-amber"}`} style={{ height: `${h}%`, minHeight: v == null ? 0 : 2 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {periods.map((p, i) => (
          <span key={i} className="flex-1 text-center text-[8px] text-term-gray">{p.slice(0, 4)}</span>
        ))}
      </div>
    </div>
  );
}

export function FundamentalGraphView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.financials(symbol, "annual"), 0, [symbol]);

  const derived = useMemo(() => {
    if (!data) return null;
    const rev = lineValues(data.income, "totalRevenue");
    // Drop leading periods Yahoo returns with no revenue (null boundary years).
    const keep = data.periods.map((_, i) => i).filter((i) => rev[i] != null);
    const pick = (vals: (number | null)[]) => keep.map((i) => vals[i] ?? null);

    const periods = keep.map((i) => data.periods[i]);
    const revK = pick(rev);
    const margin = (key: string) => {
      const num = pick(lineValues(data.income, key));
      return num.map((v, i) => (v != null && revK[i] ? (v / revK[i]!) * 100 : null));
    };
    const line = (stmt: typeof data.income, key: string) => pick(lineValues(stmt, key));
    return {
      periods,
      revenue: revK,
      grossProfit: line(data.income, "grossProfit"),
      operatingIncome: line(data.income, "operatingIncome"),
      netIncome: line(data.income, "netIncome"),
      ebitda: line(data.income, "EBITDA"),
      eps: line(data.income, "dilutedEPS"),
      grossMargin: margin("grossProfit"),
      operatingMargin: margin("operatingIncome"),
      netMargin: margin("netIncome"),
      ocf: line(data.cashflow, "operatingCashFlow"),
      fcf: line(data.cashflow, "freeCashFlow"),
      totalAssets: line(data.balance, "totalAssets"),
    };
  }, [data]);

  return (
    <Panel title={`Fundamental Graph · ${symbol}`} subtitle="Statement trends · Yahoo" error={!!error}
      className="h-full" bodyClassName="flex flex-col min-h-0">
      <DataState loading={loading} error={error} rows={8} cols={4}>
        {data && derived && (
          <div className="flex flex-col min-h-0 flex-1 overflow-auto">
            <SectionHead title={`Income Statement Trend (${derived.periods.length} years, $)`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-term-border">
              <BarChart title="Total Revenue" periods={derived.periods} values={derived.revenue} unit="money" />
              <BarChart title="Gross Profit" periods={derived.periods} values={derived.grossProfit} unit="money" />
              <BarChart title="Operating Income" periods={derived.periods} values={derived.operatingIncome} unit="money" />
              <BarChart title="Net Income" periods={derived.periods} values={derived.netIncome} unit="money" />
              <BarChart title="EBITDA" periods={derived.periods} values={derived.ebitda} unit="money" />
              <BarChart title="Diluted EPS" periods={derived.periods} values={derived.eps} unit="eps" />
            </div>
            <SectionHead title="Margins (% of revenue)" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-term-border">
              <BarChart title="Gross Margin %" periods={derived.periods} values={derived.grossMargin} unit="pct" />
              <BarChart title="Operating Margin %" periods={derived.periods} values={derived.operatingMargin} unit="pct" />
              <BarChart title="Net Margin %" periods={derived.periods} values={derived.netMargin} unit="pct" />
            </div>
            <SectionHead title="Cash Flow & Balance" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-term-border">
              <BarChart title="Operating Cash Flow" periods={derived.periods} values={derived.ocf} unit="money" />
              <BarChart title="Free Cash Flow" periods={derived.periods} values={derived.fcf} unit="money" />
              <BarChart title="Total Assets" periods={derived.periods} values={derived.totalAssets} unit="money" />
            </div>
            <div className="p-3 text-2xs text-term-gray border-t border-term-border">
              Annual figures from Yahoo fundamentals time-series (most recent {derived.periods.length} fiscal years).
              For the full line-item tables see <span className="text-accent-amber">FA</span>; EPS is per-share, all
              others in currency. Negative bars render <span className="text-term-red">red</span>.
            </div>
          </div>
        )}
      </DataState>
    </Panel>
  );
}
