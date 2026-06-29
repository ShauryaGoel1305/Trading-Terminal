import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice, trendClass } from "../lib/format";

const REC_COLORS = ["#00ff41", "#7dff00", "#ffaa00", "#ff8800", "#ff3333"];

export function EstimatesView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.fundamentals(symbol), 0, [symbol]);
  const a = data?.analyst;
  const upside =
    a?.targetMean && a?.currentPrice ? (a.targetMean / a.currentPrice - 1) * 100 : null;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-px bg-term-border overflow-auto">
      <Panel title={`Analyst Ratings · ${symbol}`} error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} rows={8} cols={2}>
          {data && a && (
            <div>
              <SectionHead title="Consensus" />
              <Metric label="Recommendation" value={(a.recommendationKey ?? "—").toUpperCase()} valueClass="text-accent-amber" />
              <Metric label="# of Analysts" value={a.numberOfAnalysts ?? "—"} />
              <Metric label="Current Price" value={fmtPrice(a.currentPrice)} />
              <Metric label="Target Mean" value={fmtPrice(a.targetMean)} valueClass="text-accent-amber" />
              <Metric label="Target High" value={fmtPrice(a.targetHigh)} valueClass="up" />
              <Metric label="Target Low" value={fmtPrice(a.targetLow)} valueClass="down" />
              <Metric label="Implied Upside" value={upside == null ? "—" : fmtPct(upside)} valueClass={trendClass(upside)} />

              <SectionHead title="Recommendation Trend" />
              <div className="p-2 space-y-1">
                {data.recommendationTrend.slice(0, 4).map((t) => {
                  const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell || 1;
                  const segs = [t.strongBuy, t.buy, t.hold, t.sell, t.strongSell];
                  return (
                    <div key={t.period} className="flex items-center gap-2">
                      <span className="text-2xs text-term-gray w-8">{t.period}</span>
                      <div className="flex-1 flex h-3 overflow-hidden">
                        {segs.map((v, i) => (
                          <div key={i} style={{ width: `${(v / total) * 100}%`, background: REC_COLORS[i] }} title={`${v}`} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 text-2xs text-term-gray pt-1">
                  <span style={{ color: REC_COLORS[0] }}>Strong Buy</span>
                  <span style={{ color: REC_COLORS[2] }}>Hold</span>
                  <span style={{ color: REC_COLORS[4] }}>Strong Sell</span>
                </div>
              </div>
            </div>
          )}
        </DataState>
      </Panel>

      <Panel title="Earnings & Estimates" error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} rows={8} cols={3}>
          {data && (
            <div>
              <SectionHead title="Earnings History (EPS Actual vs Est.)" />
              <table className="w-full text-2xs">
                <thead>
                  <tr className="text-term-gray">
                    <th className="px-2 py-1 text-left font-normal">Quarter</th>
                    <th className="num px-2 py-1 font-normal">Actual</th>
                    <th className="num px-2 py-1 font-normal">Est.</th>
                    <th className="num px-2 py-1 font-normal">Surprise</th>
                  </tr>
                </thead>
                <tbody>
                  {data.earningsHistory.map((h, i) => (
                    <tr key={i} className="border-b border-term-border/30">
                      <td className="px-2 py-1 text-term-white">{h.quarter?.slice(0, 7)}</td>
                      <td className="num px-2 py-1 text-term-white">{fmtNum(h.epsActual)}</td>
                      <td className="num px-2 py-1 text-term-gray">{fmtNum(h.epsEstimate)}</td>
                      <td className={`num px-2 py-1 ${trendClass(h.surprisePercent)}`}>
                        {h.surprisePercent == null ? "—" : fmtPct(h.surprisePercent * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <SectionHead title="Forward Estimates" />
              <table className="w-full text-2xs">
                <thead>
                  <tr className="text-term-gray">
                    <th className="px-2 py-1 text-left font-normal">Period</th>
                    <th className="num px-2 py-1 font-normal">EPS Avg</th>
                    <th className="num px-2 py-1 font-normal">Range</th>
                    <th className="num px-2 py-1 font-normal">Rev Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.earningsTrend.map((t, i) => (
                    <tr key={i} className="border-b border-term-border/30">
                      <td className="px-2 py-1 text-term-white">{t.period}</td>
                      <td className="num px-2 py-1 text-accent-amber">{fmtNum(t.epsAvg)}</td>
                      <td className="num px-2 py-1 text-term-gray">{fmtNum(t.epsLow)}–{fmtNum(t.epsHigh)}</td>
                      <td className="num px-2 py-1 text-term-gray">{fmtCompact(t.revenueAvg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </Panel>
    </div>
  );
}
