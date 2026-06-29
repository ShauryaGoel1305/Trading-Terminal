import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtNum, fmtPct } from "../lib/format";

function asNum(v: number | string | null | undefined): number | null {
  return typeof v === "number" ? v : null;
}

export function ShortInterestView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.fundamentals(symbol), 0, [symbol]);
  const s = data?.stats ?? {};

  const sharesShort = asNum(s.sharesShort);
  const priorShort = asNum(s.sharesShortPriorMonth);
  const shortRatio = asNum(s.shortRatio);
  const pctFloat = asNum(s.shortPercentOfFloat);
  const pctShares = asNum(s.shortPercentOfShares);
  const dateMs = asNum(s.shortInterestDate);
  const float = asNum(s.floatShares);
  const change =
    sharesShort != null && priorShort != null && priorShort !== 0
      ? (sharesShort / priorShort - 1) * 100
      : null;

  const hasData = sharesShort != null || pctFloat != null || shortRatio != null;

  return (
    <Panel
      title={`Short Interest · ${symbol}`}
      subtitle="Exchange-reported (bi-monthly)"
      error={!!error}
      className="h-full"
    >
      <DataState loading={loading} error={error} rows={8} cols={2}>
        {data && (
          hasData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-term-border">
              <div className="bg-bg-panel">
                <SectionHead title="Current Short Position" />
                <Metric label="Shares Short" value={fmtCompact(sharesShort)} valueClass="text-accent-amber" />
                <Metric label="Prior Month" value={fmtCompact(priorShort)} />
                <Metric label="MoM Change" value={change == null ? "—" : fmtPct(change)}
                  valueClass={change == null ? "" : change >= 0 ? "up" : "down"} />
                <Metric label="As of" value={dateMs ? new Date(dateMs).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "—"} />
              </div>
              <div className="bg-bg-panel">
                <SectionHead title="Squeeze / Crowding Metrics" />
                <Metric label="Short % of Float" value={pctFloat == null ? "—" : fmtPct(pctFloat * 100)}
                  valueClass={pctFloat != null && pctFloat > 0.2 ? "text-term-red" : "text-term-white"} />
                <Metric label="Short % of Shares Out" value={pctShares == null ? "—" : fmtPct(pctShares * 100)} />
                <Metric label="Days to Cover (short ratio)" value={fmtNum(shortRatio)}
                  valueClass={shortRatio != null && shortRatio > 5 ? "text-term-red" : "text-term-white"} />
                <Metric label="Public Float" value={fmtCompact(float)} />
              </div>
              <div className="bg-bg-panel lg:col-span-2 p-3 text-2xs text-term-gray leading-relaxed border-t border-term-border">
                Short interest is reported to FINRA/exchanges twice monthly (settlement mid-month and month-end) and
                published with a short lag — it is not real-time. <span className="text-term-white">Short % of float</span> above
                ~20% and a <span className="text-term-white">days-to-cover</span> above ~5 are commonly flagged as crowded /
                squeeze-prone. Source: Yahoo (exchange data).
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-2xs text-term-gray">
              No short-interest figures are currently published for {symbol}. This is normal for ETFs, ADRs and
              recently-listed names; exchange short-interest is equity-specific and lags by 1–2 weeks.
            </div>
          )
        )}
      </DataState>
    </Panel>
  );
}
