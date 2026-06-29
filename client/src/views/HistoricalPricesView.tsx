import { useState } from "react";
import { DataState, LiveIndicator } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtPrice, fmtPct, fmtVolume, trendClass } from "../lib/format";
import type { Candle, Timeframe } from "../types";

const TIMEFRAMES: Timeframe[] = ["1M", "3M", "6M", "1Y", "5Y"];

function fmtDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function HistoricalPricesView({ symbol }: { symbol: string }) {
  const [tf, setTf] = useState<Timeframe>("1Y");
  const { data, loading, error, lastUpdated } = usePolling(
    () => api.chart(symbol, tf),
    60_000,
    [symbol, tf]
  );

  const candles = data?.candles ?? [];
  // Day-over-day % change, then show newest first.
  const rows = candles
    .map((c: Candle, i: number) => {
      const prev = i > 0 ? candles[i - 1].close : null;
      const pct = prev ? ((c.close - prev) / prev) * 100 : null;
      return { ...c, pct };
    })
    .reverse();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-2 py-1 bg-bg-header border-b border-term-border text-2xs">
        <span className="text-accent-amber font-semibold uppercase">Historical Prices · {symbol}</span>
        <div className="flex gap-px">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-1.5 py-0.5 ${t === tf ? "bg-accent-orange text-black font-bold" : "text-term-gray hover:text-term-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {error && <span className="badge-error">Data Unavailable</span>}
        <LiveIndicator lastUpdated={lastUpdated} staleAfter={120} />
      </div>

      <div className="flex-1 overflow-auto">
        <DataState loading={loading && candles.length === 0} error={error} empty={candles.length === 0} rows={14} cols={6}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-secondary text-2xs text-term-gray uppercase">
              <tr>
                <th className="text-left px-2 py-1">Date</th>
                <th className="text-right px-2 py-1">Open</th>
                <th className="text-right px-2 py-1">High</th>
                <th className="text-right px-2 py-1">Low</th>
                <th className="text-right px-2 py-1">Close</th>
                <th className="text-right px-2 py-1 w-20">% Chg</th>
                <th className="text-right px-2 py-1">Volume</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.time} className="border-b border-term-border/30 hover:bg-bg-secondary">
                  <td className="px-2 py-1 text-term-white">{fmtDate(r.time)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtPrice(r.open)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtPrice(r.high)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtPrice(r.low)}</td>
                  <td className="num px-2 py-1 text-term-white">{fmtPrice(r.close)}</td>
                  <td className={`num px-2 py-1 ${trendClass(r.pct)}`}>{r.pct == null ? "—" : fmtPct(r.pct)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtVolume(r.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </div>
    </div>
  );
}
