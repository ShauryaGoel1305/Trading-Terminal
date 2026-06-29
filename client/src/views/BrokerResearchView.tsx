import { useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { DataState } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtPrice, fmtPct, fmtNum } from "../lib/format";
import type { BrokerAction, BrokerResearchResponse } from "../types";

const REC_COLORS = ["#00ff41", "#7dff00", "#ffaa00", "#ff8800", "#ff3333"];

// Colour a rating action by its kind.
function kindClass(kind: BrokerAction["kind"]): string {
  switch (kind) {
    case "upgrade": return "text-term-green";
    case "downgrade": return "text-term-red";
    case "initiate": return "text-accent-amber";
    default: return "text-term-gray";
  }
}
function kindBadge(kind: BrokerAction["kind"]): string {
  switch (kind) {
    case "upgrade": return "▲";
    case "downgrade": return "▼";
    case "initiate": return "✦";
    default: return "•";
  }
}

// Tint a grade string roughly bullish→bearish.
function gradeClass(grade: string): string {
  const g = (grade ?? "").toLowerCase();
  if (/(strong buy|buy|outperform|overweight|positive|accumulate|conviction)/.test(g)) return "text-term-green";
  if (/(sell|underperform|underweight|reduce|negative)/.test(g)) return "text-term-red";
  if (/(hold|neutral|market perform|equal-weight|equalweight|in-line|sector perform|peer perform)/.test(g)) return "text-accent-amber";
  return "text-term-white";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// Yahoo Finance's analyst-research page for the ticker — consensus ratings,
// price targets and the recommendation trend. Free and always readable; the
// reliable destination since full-text proprietary PDFs are paywalled.
function analysisUrl(symbol: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/analysis`;
}

// Best-effort PDF hunt: a PDF-scoped search for that firm's note on the stock.
// When a free full-text report actually exists (boutique initiations, cached
// notes, etc.) it usually opens directly; bulge-bracket PDFs are paywalled, so
// most hunts come up empty — that's expected.
function pdfHuntUrl(r: BrokerAction, symbol: string, companyName: string): string {
  const q = `"${r.firm}" ${companyName} (${symbol}) equity research report filetype:pdf`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

type Tab = "actions" | "coverage" | "targets";

export function BrokerResearchView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.brokerResearch(symbol), 0, [symbol]);
  const [tab, setTab] = useState<Tab>("actions");
  const [query, setQuery] = useState("");

  return (
    <Panel
      title={`Broker Research · ${symbol}`}
      subtitle="Sell-side ratings & price targets"
      error={!!error}
      className="h-full"
      bodyClassName="flex flex-col min-h-0"
    >
      <DataState loading={loading} error={error} rows={12} cols={4}>
        {data && (
          <div className="flex flex-col min-h-0 flex-1">
            <Summary data={data} />

            <div className="flex items-stretch border-b border-term-border text-2xs shrink-0">
              <TabBtn active={tab === "actions"} onClick={() => setTab("actions")}
                label="Rating Actions" count={data.actions.length} />
              <TabBtn active={tab === "coverage"} onClick={() => setTab("coverage")}
                label="Firm Coverage" count={data.coverage.length} />
              <TabBtn active={tab === "targets"} onClick={() => setTab("targets")}
                label="Price Targets & Consensus" />
            </div>

            {tab === "targets" ? (
              <TargetsTab data={data} />
            ) : (
              <ActionsTable
                rows={tab === "actions" ? data.actions : data.coverage}
                query={query}
                setQuery={setQuery}
                coverageMode={tab === "coverage"}
                symbol={data.symbol}
                companyName={data.companyName}
              />
            )}
          </div>
        )}
      </DataState>
    </Panel>
  );
}

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 uppercase tracking-wider border-r border-term-border ${
        active ? "bg-accent-orange text-black font-semibold" : "text-term-gray hover:text-term-white"
      }`}
    >
      {label}
      {count != null && <span className={`ml-1.5 ${active ? "text-black/70" : "text-term-gray"}`}>{count}</span>}
    </button>
  );
}

function Summary({ data }: { data: BrokerResearchResponse }) {
  const { summary, targets } = data;
  const upside =
    targets.mean && targets.current ? (targets.mean / targets.current - 1) * 100 : null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-2xs border-b border-term-border shrink-0">
      <Stat label="Covering firms" value={String(summary.coveringFirms)} />
      <Stat label="Total actions" value={String(summary.totalActions)} />
      <Stat label="Last 90d" value={`${summary.actions90d}`} />
      <Stat label="Upgrades 90d" value={String(summary.upgrades90d)} valueClass="text-term-green" />
      <Stat label="Downgrades 90d" value={String(summary.downgrades90d)} valueClass="text-term-red" />
      <Stat label="Initiations 90d" value={String(summary.initiations90d)} valueClass="text-accent-amber" />
      <span className="text-term-border">│</span>
      <Stat label="Consensus" value={(targets.recommendationKey ?? "—").toUpperCase().replace(/_/g, " ")} valueClass="text-accent-amber" />
      <Stat label="Mean target" value={fmtPrice(targets.mean)} valueClass="text-accent-amber" />
      <Stat label="Implied upside" value={upside == null ? "—" : fmtPct(upside)}
        valueClass={upside == null ? "" : upside >= 0 ? "text-term-green" : "text-term-red"} />
    </div>
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

function ActionsTable({
  rows, query, setQuery, coverageMode, symbol, companyName,
}: {
  rows: BrokerAction[];
  query: string;
  setQuery: (s: string) => void;
  coverageMode: boolean;
  symbol: string;
  companyName: string;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.firm.toLowerCase().includes(q) ||
        r.toGrade.toLowerCase().includes(q) ||
        r.fromGrade.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by firm, rating or action…"
          className="flex-1 max-w-xs bg-bg-secondary border border-term-border px-2 py-1 text-2xs text-term-white placeholder:text-term-gray focus:outline-none focus:border-accent-orange"
        />
        <span className="text-2xs text-term-gray">
          {filtered.length} {coverageMode ? "firms" : "actions"}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-bg-header text-term-gray">
            <tr>
              <th className="px-3 py-1 text-left font-normal">{coverageMode ? "Last Action" : "Date"}</th>
              <th className="px-3 py-1 text-left font-normal">Firm</th>
              <th className="px-3 py-1 text-left font-normal">Action</th>
              <th className="px-3 py-1 text-left font-normal">From</th>
              <th className="px-3 py-1 text-left font-normal">{coverageMode ? "Current Rating" : "To"}</th>
              <th className="px-3 py-1 text-right font-normal">Report</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-b border-term-border/30 hover:bg-bg-secondary/40">
                <td className="px-3 py-1 text-term-gray whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-3 py-1 text-term-white whitespace-nowrap">{r.firm}</td>
                <td className={`px-3 py-1 whitespace-nowrap ${kindClass(r.kind)}`}>
                  <span className="inline-block w-3">{kindBadge(r.kind)}</span> {r.action}
                </td>
                <td className={`px-3 py-1 whitespace-nowrap ${r.fromGrade ? gradeClass(r.fromGrade) : "text-term-gray"}`}>
                  {r.fromGrade || "—"}
                </td>
                <td className={`px-3 py-1 whitespace-nowrap font-semibold ${gradeClass(r.toGrade)}`}>
                  {r.toGrade || "—"}
                </td>
                <td className="px-3 py-1 text-right whitespace-nowrap">
                  <a
                    href={analysisUrl(symbol)}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open Yahoo Finance analyst research for ${symbol}`}
                    className="text-accent-orange hover:underline"
                  >
                    Yahoo ↗
                  </a>
                  <a
                    href={pdfHuntUrl(r, symbol, companyName)}
                    target="_blank"
                    rel="noreferrer"
                    title={`Hunt for a free full-text PDF of ${r.firm}'s ${symbol} research`}
                    className="ml-3 text-term-gray hover:text-accent-orange hover:underline"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-term-gray">No matching research actions.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetsTab({ data }: { data: BrokerResearchResponse }) {
  const { targets, recommendationTrend } = data;
  const cur = targets.current;
  // Position the current price along the low→high target band.
  const pct =
    cur != null && targets.low != null && targets.high != null && targets.high > targets.low
      ? Math.min(100, Math.max(0, ((cur - targets.low) / (targets.high - targets.low)) * 100))
      : null;

  return (
    <div className="flex-1 overflow-auto p-3 space-y-4">
      <div>
        <div className="text-2xs text-term-gray uppercase tracking-wider mb-2">12-Month Price Target Range</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Target label="Low" value={fmtPrice(targets.low)} cls="text-term-red" />
          <Target label="Mean" value={fmtPrice(targets.mean)} cls="text-accent-amber" />
          <Target label="Median" value={fmtPrice(targets.median)} cls="text-accent-amber" />
          <Target label="High" value={fmtPrice(targets.high)} cls="text-term-green" />
        </div>
        {targets.low != null && targets.high != null && (
          <div className="relative h-8">
            <div className="absolute inset-x-0 top-3 h-1.5 bg-gradient-to-r from-term-red via-accent-amber to-term-green" />
            {pct != null && (
              <div className="absolute top-1 flex flex-col items-center -translate-x-1/2" style={{ left: `${pct}%` }}>
                <div className="w-0.5 h-5 bg-term-white" />
                <span className="text-2xs text-term-white whitespace-nowrap mt-0.5">{fmtPrice(cur)} now</span>
              </div>
            )}
            <span className="absolute left-0 top-5 text-2xs text-term-gray">{fmtPrice(targets.low)}</span>
            <span className="absolute right-0 top-5 text-2xs text-term-gray">{fmtPrice(targets.high)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-2xs">
        <Stat label="# Analysts" value={String(targets.numberOfAnalysts ?? "—")} />
        <Stat label="Rec. mean (1=Buy,5=Sell)" value={targets.recommendationMean != null ? fmtNum(targets.recommendationMean) : "—"} valueClass="text-accent-amber" />
        <Stat label="Consensus" value={(targets.recommendationKey ?? "—").toUpperCase().replace(/_/g, " ")} valueClass="text-accent-amber" />
      </div>

      {recommendationTrend.length > 0 && (
        <div>
          <div className="text-2xs text-term-gray uppercase tracking-wider mb-2">Recommendation Trend (last 4 months)</div>
          <div className="space-y-1.5 max-w-md">
            {recommendationTrend.slice(0, 4).map((t) => {
              const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell || 1;
              const segs = [t.strongBuy, t.buy, t.hold, t.sell, t.strongSell];
              return (
                <div key={t.period} className="flex items-center gap-2">
                  <span className="text-2xs text-term-gray w-10">{t.period}</span>
                  <div className="flex-1 flex h-4 overflow-hidden border border-term-border">
                    {segs.map((v, i) => (
                      <div key={i} style={{ width: `${(v / total) * 100}%`, background: REC_COLORS[i] }} title={`${["Strong Buy","Buy","Hold","Sell","Strong Sell"][i]}: ${v}`} />
                    ))}
                  </div>
                  <span className="text-2xs text-term-gray w-8 text-right">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 text-2xs text-term-gray pt-2">
            {["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"].map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                <span className="inline-block w-2 h-2" style={{ background: REC_COLORS[i] }} />{l}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-2xs text-term-gray border-t border-term-border pt-3 leading-relaxed">
        Ratings, target prices and rating changes are aggregated from sell-side firms (Goldman Sachs, Morgan Stanley,
        JP Morgan, Jefferies, UBS, Barclays, Citigroup and others). Full-text proprietary PDFs are paywalled and not on
        the open web, so each row's <span className="text-accent-orange">Yahoo ↗</span> link opens Yahoo Finance's free
        analyst-research page, while <span className="text-term-white">PDF</span> runs a best-effort hunt for a free
        full-text report — usually only boutique/independent notes turn up, as bulge-bracket PDFs stay paywalled.
      </p>
    </div>
  );
}

function Target({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="border border-term-border bg-bg-secondary px-2 py-1.5">
      <div className="text-2xs text-term-gray uppercase tracking-wider">{label}</div>
      <div className={`font-mono text-sm ${cls}`}>{value}</div>
    </div>
  );
}
