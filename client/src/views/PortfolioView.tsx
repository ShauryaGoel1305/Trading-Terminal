import { useMemo } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { useMarketData } from "../hooks/useMarketData";
import { useStore } from "../store";
import { fmtCompact, fmtPct, fmtPrice, trendClass } from "../lib/format";

export function PortfolioView({ onSelect }: { onSelect: (s: string) => void }) {
  const { positions, removePosition } = useStore();
  const symbols = positions.map((p) => p.symbol);
  const { data, loading } = useMarketData(symbols, 30_000);
  const bySym = new Map((data ?? []).map((q) => [q.symbol, q]));

  const rows = useMemo(
    () =>
      positions.map((p) => {
        const q = bySym.get(p.symbol);
        const price = q?.price ?? null;
        const mv = price != null ? price * p.qty : null;
        const cost = p.costBasis * p.qty;
        const upnl = mv != null ? mv - cost : null;
        const upnlPct = mv != null && cost ? (mv / cost - 1) * 100 : null;
        const dayChg = q?.change != null ? q.change * p.qty : null;
        return { ...p, price, mv, cost, upnl, upnlPct, dayChg, changePercent: q?.changePercent ?? null };
      }),
    [positions, data] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const totals = useMemo(() => {
    let mv = 0;
    let cost = 0;
    let day = 0;
    let known = true;
    for (const r of rows) {
      if (r.mv == null) known = false;
      mv += r.mv ?? 0;
      cost += r.cost;
      day += r.dayChg ?? 0;
    }
    return { mv, cost, day, upnl: mv - cost, upnlPct: cost ? (mv / cost - 1) * 100 : 0, known };
  }, [rows]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-px bg-term-border overflow-auto">
      <Panel title="Portfolio Positions" subtitle={`${positions.length}`} className="min-h-0">
        <DataState loading={loading && symbols.length > 0 && !data} empty={positions.length === 0} rows={8} cols={6}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-header text-term-gray text-2xs uppercase">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Symbol</th>
                <th className="num px-2 py-1 font-normal">Qty</th>
                <th className="num px-2 py-1 font-normal">Cost</th>
                <th className="num px-2 py-1 font-normal">Last</th>
                <th className="num px-2 py-1 font-normal">Mkt Val</th>
                <th className="num px-2 py-1 font-normal">Day</th>
                <th className="num px-2 py-1 font-normal">Unrl P&L</th>
                <th className="num px-2 py-1 font-normal">%</th>
                <th className="px-1"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-b border-term-border/30 group hover:bg-bg-secondary">
                  <td onClick={() => onSelect(r.symbol)} className="px-2 py-1 font-semibold text-accent-amber cursor-pointer">{r.symbol}</td>
                  <td className="num px-2 py-1 text-term-white">{r.qty}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtPrice(r.costBasis)}</td>
                  <td className="num px-2 py-1 text-term-white">{fmtPrice(r.price)}</td>
                  <td className="num px-2 py-1 text-term-white">{r.mv == null ? "—" : fmtCompact(r.mv)}</td>
                  <td className={`num px-2 py-1 ${trendClass(r.changePercent)}`}>{fmtPct(r.changePercent)}</td>
                  <td className={`num px-2 py-1 ${trendClass(r.upnl)}`}>{r.upnl == null ? "—" : fmtCompact(r.upnl)}</td>
                  <td className={`num px-2 py-1 ${trendClass(r.upnlPct)}`}>{r.upnlPct == null ? "—" : fmtPct(r.upnlPct)}</td>
                  <td className="px-1">
                    <button onClick={() => removePosition(r.symbol)} className="opacity-0 group-hover:opacity-100 text-term-red text-2xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Panel>

      <Panel title="Summary" className="min-h-0">
        <SectionHead title="Totals" />
        <Metric label="Market Value" value={fmtCompact(totals.mv)} valueClass="text-accent-amber" />
        <Metric label="Cost Basis" value={fmtCompact(totals.cost)} />
        <Metric label="Day P&L" value={fmtCompact(totals.day)} valueClass={trendClass(totals.day)} />
        <Metric label="Unrealized P&L" value={fmtCompact(totals.upnl)} valueClass={trendClass(totals.upnl)} />
        <Metric label="Total Return" value={fmtPct(totals.upnlPct)} valueClass={trendClass(totals.upnlPct)} />
        <SectionHead title="Allocation" />
        <div className="p-2 space-y-1">
          {rows
            .filter((r) => r.mv != null && totals.mv > 0)
            .sort((a, b) => (b.mv ?? 0) - (a.mv ?? 0))
            .map((r) => {
              const w = ((r.mv ?? 0) / totals.mv) * 100;
              return (
                <div key={r.symbol} className="flex items-center gap-2">
                  <span className="text-2xs text-term-white w-12">{r.symbol}</span>
                  <div className="flex-1 h-2 bg-bg-secondary">
                    <div className="h-2 bg-accent-orange" style={{ width: `${w}%` }} />
                  </div>
                  <span className="num text-2xs text-term-gray w-10 text-right">{w.toFixed(1)}%</span>
                </div>
              );
            })}
          {positions.length === 0 && <div className="text-2xs text-term-gray">Use TRADE to add paper positions.</div>}
        </div>
      </Panel>
    </div>
  );
}
