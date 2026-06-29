import { useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { DataState } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice, fmtVolume, trendClass } from "../lib/format";

export function ScreenerView({ onSelect }: { onSelect: (s: string) => void }) {
  const [screens, setScreens] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState("day_gainers");
  // client-side factor filters
  const [minMktCap, setMinMktCap] = useState(0);
  const [maxPE, setMaxPE] = useState(0);

  useEffect(() => {
    api.screens().then(setScreens).catch(() => {});
  }, []);

  const { data, loading, error } = usePolling(() => api.screen(active), 120_000, [active]);

  const rows = (data?.results ?? []).filter((r) => {
    if (minMktCap && (r.marketCap ?? 0) < minMktCap) return false;
    if (maxPE && (r.trailingPE == null || r.trailingPE > maxPE)) return false;
    return true;
  });

  return (
    <Panel
      title="Equity Screener"
      subtitle={data?.title}
      error={!!error}
      right={
        <div className="flex items-center gap-2">
          <label className="text-2xs text-term-gray">
            MinCap
            <select
              value={minMktCap}
              onChange={(e) => setMinMktCap(Number(e.target.value))}
              className="ml-1 bg-black text-accent-amber border border-term-border focus:outline-none"
            >
              <option value={0}>Any</option>
              <option value={2e9}>2B</option>
              <option value={1e10}>10B</option>
              <option value={1e11}>100B</option>
            </select>
          </label>
          <label className="text-2xs text-term-gray">
            MaxP/E
            <select
              value={maxPE}
              onChange={(e) => setMaxPE(Number(e.target.value))}
              className="ml-1 bg-black text-accent-amber border border-term-border focus:outline-none"
            >
              <option value={0}>Any</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      }
    >
      <div className="flex flex-wrap gap-px p-1 border-b border-term-border bg-bg-secondary">
        {screens.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`text-2xs px-2 py-0.5 ${
              s.id === active ? "bg-accent-orange text-black font-bold" : "text-term-gray hover:text-term-white border border-term-border"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <DataState loading={loading} error={error} empty={!!data && rows.length === 0} rows={12} cols={6}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-header text-term-gray text-2xs uppercase">
            <tr>
              <th className="px-2 py-1 text-left font-normal">Symbol</th>
              <th className="px-2 py-1 text-left font-normal">Name</th>
              <th className="num px-2 py-1 font-normal">Last</th>
              <th className="num px-2 py-1 font-normal">Chg%</th>
              <th className="num px-2 py-1 font-normal">Volume</th>
              <th className="num px-2 py-1 font-normal">Mkt Cap</th>
              <th className="num px-2 py-1 font-normal">P/E</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.symbol}
                onClick={() => onSelect(r.symbol)}
                className="border-b border-term-border/30 cursor-pointer hover:bg-bg-secondary"
              >
                <td className="px-2 py-1 font-semibold text-accent-amber">{r.symbol}</td>
                <td className="px-2 py-1 text-term-gray truncate max-w-[180px]">{r.name}</td>
                <td className="num px-2 py-1 text-term-white">{fmtPrice(r.price)}</td>
                <td className={`num px-2 py-1 ${trendClass(r.changePercent)}`}>{fmtPct(r.changePercent)}</td>
                <td className="num px-2 py-1 text-term-gray">{fmtVolume(r.volume)}</td>
                <td className="num px-2 py-1 text-term-gray">{fmtCompact(r.marketCap)}</td>
                <td className="num px-2 py-1 text-term-gray">{fmtNum(r.trailingPE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataState>
    </Panel>
  );
}
