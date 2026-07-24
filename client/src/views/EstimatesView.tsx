import { useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice, trendClass } from "../lib/format";
import type { Fundamentals } from "../types";

const REC_COLORS = ["#00ff41", "#7dff00", "#ffaa00", "#ff8800", "#ff3333"];

function ConsensusTab({ data }: { data: Fundamentals }) {
  const a = data.analyst;
  const upside = a?.targetMean && a?.currentPrice ? (a.targetMean / a.currentPrice - 1) * 100 : null;
  if (!a) return null;
  return (
    <div>
      <SectionHead title="Consensus" />
      <Metric label="Recommendation" value={(a.recommendationKey ?? "—").toUpperCase()} valueClass="text-accent-amber" />
      <Metric label="# of Analysts" value={a.numberOfAnalysts ?? "—"} />
      <Metric label="Current Price" value={fmtPrice(a.currentPrice)} />
      <Metric label="Target Mean" value={fmtPrice(a.targetMean)} valueClass="text-accent-amber" />
      <Metric label="Target High" value={fmtPrice(a.targetHigh)} valueClass="up" />
      <Metric label="Target Low" value={fmtPrice(a.targetLow)} valueClass="down" />
      <Metric label="Implied Upside" value={upside == null ? "—" : fmtPct(upside)} valueClass={trendClass(upside)} />

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
  );
}

function EarningsHistoryTab({ data }: { data: Fundamentals }) {
  return (
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
    </div>
  );
}

function RecommendationTrendTab({ data }: { data: Fundamentals }) {
  return (
    <div className="p-2 space-y-1">
      <SectionHead title="Recommendation Trend" />
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
  );
}

function SurpriseHistoryTab({ data }: { data: Fundamentals }) {
  const rows = data.earningsHistory.filter((h) => h.surprisePercent != null);
  return (
    <div>
      <SectionHead title="EPS Surprise History" />
      {rows.length === 0 ? (
        <div className="p-4 text-2xs text-term-gray">No surprise history on record.</div>
      ) : (
        <div className="p-2 space-y-1">
          {rows.map((h, i) => {
            const pct = (h.surprisePercent ?? 0) * 100;
            const width = Math.min(100, Math.abs(pct) * 4);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-2xs text-term-gray w-16">{h.quarter?.slice(0, 7)}</span>
                <div className="flex-1 flex h-3 bg-bg-secondary">
                  <div
                    className={pct >= 0 ? "bg-term-green" : "bg-term-red"}
                    style={{ width: `${width}%`, marginLeft: pct < 0 ? `${50 - width}%` : "50%" }}
                  />
                </div>
                <span className={`num text-2xs w-14 text-right ${trendClass(pct)}`}>{fmtPct(pct)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "consensus", label: "Consensus & Targets" },
  { key: "earnings", label: "Earnings History" },
  { key: "recommendations", label: "Recommendation Trend" },
  { key: "surprise", label: "Surprise History" },
] as const;
type TabKey = typeof TABS[number]["key"];

// EE, ERN, ANR and SURP share this data source but are genuinely distinct
// Bloomberg concepts (consensus targets / earnings history / ratings
// distribution / surprise history) — rendered as tabs, not four aliases.
export function EstimatesView({ symbol, defaultTab = "consensus" }: { symbol: string; defaultTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(defaultTab);
  useEffect(() => setTab(defaultTab), [defaultTab]);
  const { data, loading, error } = usePolling(() => api.fundamentals(symbol), 0, [symbol]);

  return (
    <Panel title={`Estimates & Earnings · ${symbol}`} error={!!error} className="h-full" bodyClassName="flex flex-col min-h-0">
      <div className="flex gap-px border-b border-term-border bg-bg-secondary overflow-x-auto shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-2xs px-3 py-1.5 uppercase whitespace-nowrap ${
              t.key === tab ? "bg-accent-orange text-black font-bold" : "text-term-gray hover:text-term-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <DataState loading={loading} error={error} rows={8} cols={2}>
          {data && (
            <>
              {tab === "consensus" && <ConsensusTab data={data} />}
              {tab === "earnings" && <EarningsHistoryTab data={data} />}
              {tab === "recommendations" && <RecommendationTrendTab data={data} />}
              {tab === "surprise" && <SurpriseHistoryTab data={data} />}
            </>
          )}
        </DataState>
      </div>
    </Panel>
  );
}
