import { Panel } from "../components/Panel";
import { DataState, SectionHead } from "../components/ui";
import { useMarketData } from "../hooks/useMarketData";
import { EconomicCalendarPanel } from "../components/EconomicCalendarPanel";
import { fmtPrice, fmtPct, trendClass } from "../lib/format";
import type { Quote } from "../types";

const GROUPS: { title: string; items: { symbol: string; label: string }[] }[] = [
  {
    title: "Equity Indices",
    items: [
      { symbol: "^GSPC", label: "S&P 500" },
      { symbol: "^DJI", label: "Dow Jones" },
      { symbol: "^IXIC", label: "Nasdaq Comp" },
      { symbol: "^RUT", label: "Russell 2000" },
      { symbol: "^VIX", label: "VIX" },
      { symbol: "^FTSE", label: "FTSE 100" },
      { symbol: "^N225", label: "Nikkei 225" },
      { symbol: "^GDAXI", label: "DAX" },
    ],
  },
  {
    title: "Rates",
    items: [
      { symbol: "^IRX", label: "13W T-Bill" },
      { symbol: "^FVX", label: "5Y Treasury" },
      { symbol: "^TNX", label: "10Y Treasury" },
      { symbol: "^TYX", label: "30Y Treasury" },
    ],
  },
  {
    title: "FX & Commodities",
    items: [
      { symbol: "DX-Y.NYB", label: "US Dollar Idx" },
      { symbol: "EURUSD=X", label: "EUR/USD" },
      { symbol: "JPY=X", label: "USD/JPY" },
      { symbol: "GBPUSD=X", label: "GBP/USD" },
      { symbol: "CL=F", label: "WTI Crude" },
      { symbol: "BZ=F", label: "Brent Crude" },
      { symbol: "GC=F", label: "Gold" },
      { symbol: "SI=F", label: "Silver" },
    ],
  },
];

function MacroRow({ label, q }: { label: string; q?: Quote }) {
  const cls = trendClass(q?.changePercent);
  return (
    <div className="flex items-baseline justify-between px-2 py-1 border-b border-term-border/30">
      <span className="text-2xs text-term-white">{label}</span>
      {q && !q.error ? (
        <span className="flex items-baseline gap-2">
          <span className="num text-xs text-term-white">{fmtPrice(q.price)}</span>
          <span className={`num text-2xs w-16 text-right ${cls}`}>{fmtPct(q.changePercent)}</span>
        </span>
      ) : (
        <span className="text-2xs text-term-red">N/A</span>
      )}
    </div>
  );
}

export function EconomicView({ symbol }: { symbol: string }) {
  const allSymbols = GROUPS.flatMap((g) => g.items.map((i) => i.symbol));
  const { data, loading, error } = useMarketData(allSymbols, 30_000);
  const bySym = new Map((data ?? []).map((q) => [q.symbol, q]));

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-px bg-term-border overflow-auto">
      <Panel title="Global Macro Monitor" error={!!error && !data} className="min-h-0">
        <DataState loading={loading && !data} error={null} rows={14} cols={2}>
          <div>
            {GROUPS.map((g) => (
              <div key={g.title}>
                <SectionHead title={g.title} />
                {g.items.map((it) => (
                  <MacroRow key={it.symbol} label={it.label} q={bySym.get(it.symbol)} />
                ))}
              </div>
            ))}
          </div>
        </DataState>
      </Panel>
      <div className="min-h-0 [&>*]:h-full">
        <EconomicCalendarPanel symbol={symbol} />
      </div>
    </div>
  );
}
