import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { useQuote } from "../hooks/useQuote";
import {
  fmtPrice,
  fmtPct,
  fmtChange,
  fmtVolume,
  fmtCompact,
  fmtNum,
  trendClass,
} from "../lib/format";

interface Props {
  symbol: string;
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between px-2 py-1 border-b border-term-border/50">
      <span className="text-2xs text-term-gray uppercase">{label}</span>
      <span className={`num text-xs text-term-white ${valueClass}`}>{value}</span>
    </div>
  );
}

export function QuoteDetailPanel({ symbol }: Props) {
  const { data: q, loading, error } = useQuote(symbol, 30_000);
  const cls = trendClass(q?.changePercent);

  return (
    <Panel title={`Quote · ${symbol}`} error={!!error && !q}>
      {loading && !q ? (
        <SkeletonRows rows={8} cols={2} />
      ) : q && !q.error ? (
        <div>
          <div className="px-2 py-1.5 border-b border-term-border">
            <div className="text-xs text-term-white truncate" title={q.name}>
              {q.name}
            </div>
            <div className="text-2xs text-term-gray">
              {q.exchange} · {q.currency}
              {q.marketState && <span className="ml-1 text-accent-amber">{q.marketState}</span>}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="num text-lg text-term-white">{fmtPrice(q.price)}</span>
              <span className={`num text-xs ${cls}`}>
                {fmtChange(q.change)} ({fmtPct(q.changePercent)})
              </span>
            </div>
          </div>
          <Stat label="Open" value={fmtPrice(q.open)} />
          <Stat label="High" value={fmtPrice(q.high)} valueClass="up" />
          <Stat label="Low" value={fmtPrice(q.low)} valueClass="down" />
          <Stat label="Prev Close" value={fmtPrice(q.previousClose)} />
          <Stat label="Volume" value={fmtVolume(q.volume)} />
          <Stat label="Mkt Cap" value={q.marketCap ? fmtCompact(q.marketCap) : "—"} />
          <Stat label="P/E (TTM)" value={q.peRatio ? fmtNum(q.peRatio) : "—"} />
          <Stat label="52W High" value={fmtPrice(q.fiftyTwoWeekHigh)} />
          <Stat label="52W Low" value={fmtPrice(q.fiftyTwoWeekLow)} />
          <div className="px-2 py-1 text-2xs text-term-gray text-right">src: {q.source}</div>
        </div>
      ) : (
        <div className="p-3 text-2xs text-term-red">No quote data for {symbol}.</div>
      )}
    </Panel>
  );
}
