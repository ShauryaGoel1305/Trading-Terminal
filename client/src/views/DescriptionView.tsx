import { useEffect, useRef } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice } from "../lib/format";

function pct(v: number | null | undefined) {
  return v == null ? "—" : fmtPct(v * 100);
}

export function DescriptionView({ symbol, focus }: { symbol: string; focus?: "officers" }) {
  const { data, loading, error } = usePolling(() => api.fundamentals(symbol), 0, [symbol]);
  const s = data?.stats ?? {};
  const officersRef = useRef<HTMLDivElement>(null);

  // MGMT is "DES, but jump straight to the officers table" — reuses the same
  // profile payload rather than duplicating a whole view for one section.
  useEffect(() => {
    if (focus === "officers" && data) {
      officersRef.current?.scrollIntoView({ block: "start" });
    }
  }, [focus, data]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-px bg-term-border">
      <Panel title={`Description · ${symbol}`} error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} rows={10} cols={1}>
          {data && (
            <div>
              <div className="px-2 py-2 border-b border-term-border">
                <div className="text-sm text-term-white">{data.profile.name}</div>
                <div className="text-2xs text-accent-amber mt-0.5">
                  {data.profile.sector} · {data.profile.industry}
                </div>
                <div className="text-2xs text-term-gray mt-0.5">
                  {[data.profile.city, data.profile.state, data.profile.country].filter(Boolean).join(", ")}
                  {data.profile.employees ? ` · ${fmtCompact(data.profile.employees)} employees` : ""}
                </div>
                {data.profile.website && (
                  <a href={data.profile.website} target="_blank" rel="noreferrer" className="text-2xs text-accent-orange hover:underline">
                    {data.profile.website}
                  </a>
                )}
              </div>
              {focus !== "officers" && (
                <>
                  <SectionHead title="Business Summary" />
                  <p className="px-2 py-2 text-2xs text-term-gray leading-relaxed whitespace-pre-line">
                    {data.profile.summary ?? "No summary available."}
                  </p>
                </>
              )}
              <div ref={officersRef}>
                <SectionHead title={focus === "officers" ? "Key Executives — Management" : "Key Executives"} />
              </div>
              <table className="w-full text-2xs">
                <tbody>
                  {data.profile.officers.map((o, i) => (
                    <tr key={i} className="border-b border-term-border/40">
                      <td className="px-2 py-1 text-term-white">{o.name}</td>
                      <td className="px-2 py-1 text-term-gray">{o.title}</td>
                      <td className="num px-2 py-1 text-term-white">{o.pay ? fmtCompact(o.pay) : "—"}</td>
                      {focus === "officers" && <td className="num px-2 py-1 text-term-gray">{o.age ?? "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </Panel>

      <Panel title="Key Statistics" error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} rows={12} cols={2}>
          {data && (
            <div>
              <SectionHead title="Valuation" />
              <Metric label="Market Cap" value={fmtCompact(s.marketCap)} />
              <Metric label="Trailing P/E" value={fmtNum(s.trailingPE)} />
              <Metric label="Forward P/E" value={fmtNum(s.forwardPE)} />
              <Metric label="PEG Ratio" value={fmtNum(s.pegRatio)} />
              <Metric label="Price / Book" value={fmtNum(s.priceToBook)} />
              <Metric label="Price / Sales" value={fmtNum(s.priceToSales)} />
              <Metric label="EPS (TTM)" value={fmtPrice(s.eps)} />
              <Metric label="Beta" value={fmtNum(s.beta)} />
              <SectionHead title="Profitability" />
              <Metric label="Gross Margin" value={pct(s.grossMargin)} />
              <Metric label="Operating Margin" value={pct(s.operatingMargin)} />
              <Metric label="Profit Margin" value={pct(s.profitMargin)} />
              <Metric label="Return on Equity" value={pct(s.roe)} />
              <Metric label="Return on Assets" value={pct(s.roa)} />
              <SectionHead title="Financial Health" />
              <Metric label="Total Cash" value={fmtCompact(s.totalCash)} />
              <Metric label="Total Debt" value={fmtCompact(s.totalDebt)} />
              <Metric label="Debt / Equity" value={fmtNum(s.debtToEquity)} />
              <Metric label="Current Ratio" value={fmtNum(s.currentRatio)} />
              <Metric label="Dividend Yield" value={pct(s.dividendYield)} />
            </div>
          )}
        </DataState>
      </Panel>
    </div>
  );
}
