import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtPrice, fmtVolume } from "../lib/format";
import type { OptionRow } from "../types";

interface Props {
  symbol: string;
}

interface StrikeRow {
  strike: number;
  call?: OptionRow;
  put?: OptionRow;
}

export function OptionsChainPanel({ symbol }: Props) {
  const [expiration, setExpiration] = useState<number | undefined>(undefined);
  const { data, loading, error } = usePolling(
    () => api.options(symbol, expiration),
    300_000,
    [symbol, expiration]
  );

  const rows = useMemo<StrikeRow[]>(() => {
    if (!data) return [];
    const map = new Map<number, StrikeRow>();
    for (const c of data.calls) map.set(c.strike, { strike: c.strike, call: c });
    for (const p of data.puts) {
      const row = map.get(p.strike) ?? { strike: p.strike };
      row.put = p;
      map.set(p.strike, row);
    }
    return [...map.values()].sort((a, b) => a.strike - b.strike);
  }, [data]);

  return (
    <Panel
      title={`Options · ${symbol}`}
      error={!!error && !data}
      right={
        data && data.expirationDates.length > 0 ? (
          <select
            value={expiration ?? data.selectedExpiration ?? ""}
            onChange={(e) => setExpiration(Number(e.target.value))}
            className="bg-black text-2xs text-accent-amber border border-term-border focus:outline-none"
          >
            {data.expirationDates.map((d) => (
              <option key={d} value={d}>
                {new Date(d * 1000).toISOString().slice(0, 10)}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      {loading && !data ? (
        <SkeletonRows rows={10} cols={5} />
      ) : data && rows.length > 0 ? (
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-bg-header text-term-gray uppercase">
            <tr>
              <th className="px-1 py-1 text-right text-[#00ff41]">C Last</th>
              <th className="px-1 py-1 text-right">Bid</th>
              <th className="px-1 py-1 text-right">Ask</th>
              <th className="px-1 py-1 text-right">Vol</th>
              <th className="px-1 py-1 text-center text-accent-amber">Strike</th>
              <th className="px-1 py-1 text-right">Vol</th>
              <th className="px-1 py-1 text-right">Bid</th>
              <th className="px-1 py-1 text-right">Ask</th>
              <th className="px-1 py-1 text-right text-[#ff3333]">P Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.strike} className="border-b border-term-border/30">
                <td className={`num px-1 ${r.call?.inTheMoney ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-term-white"}`}>
                  {fmtPrice(r.call?.lastPrice ?? null)}
                </td>
                <td className="num px-1 text-term-gray">{fmtPrice(r.call?.bid ?? null)}</td>
                <td className="num px-1 text-term-gray">{fmtPrice(r.call?.ask ?? null)}</td>
                <td className="num px-1 text-term-gray">{fmtVolume(r.call?.volume ?? null)}</td>
                <td className="num px-1 text-center font-bold text-accent-amber bg-bg-secondary">
                  {fmtPrice(r.strike)}
                </td>
                <td className="num px-1 text-term-gray">{fmtVolume(r.put?.volume ?? null)}</td>
                <td className="num px-1 text-term-gray">{fmtPrice(r.put?.bid ?? null)}</td>
                <td className="num px-1 text-term-gray">{fmtPrice(r.put?.ask ?? null)}</td>
                <td className={`num px-1 ${r.put?.inTheMoney ? "bg-[#ff3333]/10 text-[#ff3333]" : "text-term-white"}`}>
                  {fmtPrice(r.put?.lastPrice ?? null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-3 text-2xs text-term-gray">No options data for {symbol}.</div>
      )}
    </Panel>
  );
}
