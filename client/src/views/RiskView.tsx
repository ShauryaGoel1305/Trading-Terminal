import { useMemo } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { useStore } from "../store";
import { beta, historicalVaR, stdev } from "../lib/indicators";
import { fmtCompact, fmtNum, fmtPct, trendClass } from "../lib/format";
import type { Candle } from "../types";

const BENCH = "SPY";

export function RiskView() {
  const { positions } = useStore();
  const symbols = positions.map((p) => p.symbol);

  const { data, loading, error } = usePolling(
    async () => {
      const all = [...new Set([...symbols, BENCH])];
      const charts = await Promise.all(all.map((s) => api.chart(s, "1Y").catch(() => null)));
      const map: Record<string, Candle[]> = {};
      all.forEach((s, i) => {
        if (charts[i]) map[s] = charts[i]!.candles;
      });
      return map;
    },
    0,
    [symbols.join(",")]
  );

  const risk = useMemo(() => {
    if (!data || positions.length === 0) return null;
    const bench = data[BENCH];
    if (!bench || bench.length < 30) return null;

    // Latest close per symbol → weights by market value.
    const lastClose: Record<string, number> = {};
    for (const s of Object.keys(data)) lastClose[s] = data[s].at(-1)?.close ?? 0;
    const values = positions.map((p) => p.qty * (lastClose[p.symbol] ?? 0));
    const totalMV = values.reduce((a, b) => a + b, 0) || 1;
    const weights = values.map((v) => v / totalMV);

    // Build aligned close map keyed by time for portfolio + benchmark.
    const times = bench.map((c) => c.time);
    const closeAt: Record<string, Map<number, number>> = {};
    for (const s of Object.keys(data)) closeAt[s] = new Map(data[s].map((c) => [c.time, c.close]));

    const portRet: number[] = [];
    const benchRet: number[] = [];
    const portEquity: number[] = [];
    let eq = 1;
    for (let i = 1; i < times.length; i++) {
      const t = times[i];
      const tPrev = times[i - 1];
      let r = 0;
      let ok = true;
      positions.forEach((p, idx) => {
        const c = closeAt[p.symbol]?.get(t);
        const cPrev = closeAt[p.symbol]?.get(tPrev);
        if (c == null || cPrev == null || cPrev === 0) ok = false;
        else r += weights[idx] * (c / cPrev - 1);
      });
      const bC = closeAt[BENCH]!.get(t)!;
      const bPrev = closeAt[BENCH]!.get(tPrev)!;
      if (!ok) continue;
      portRet.push(r);
      benchRet.push(bC / bPrev - 1);
      eq *= 1 + r;
      portEquity.push(eq);
    }

    const dailyVol = stdev(portRet);
    const annVol = dailyVol * Math.sqrt(252);
    const var95 = historicalVaR(portRet, 0.95);
    const var99 = historicalVaR(portRet, 0.99);
    const b = beta(portRet, benchRet);
    let peak = -Infinity;
    let mdd = 0;
    for (const e of portEquity) {
      if (e > peak) peak = e;
      const dd = (e - peak) / peak;
      if (dd < mdd) mdd = dd;
    }
    const meanRet = portRet.reduce((a, c) => a + c, 0) / (portRet.length || 1);
    const sharpe = dailyVol ? (meanRet / dailyVol) * Math.sqrt(252) : 0;

    return {
      totalMV,
      annVol,
      var95,
      var99,
      beta: b,
      maxDrawdown: -mdd,
      sharpe,
      days: portRet.length,
      contributions: positions.map((p, idx) => ({
        symbol: p.symbol,
        weight: weights[idx],
        value: values[idx],
      })).sort((a, b) => b.weight - a.weight),
    };
  }, [data, positions]);

  const scenarios = useMemo(() => {
    if (!risk) return [];
    const shocks = [
      { label: "Equity −5%", mkt: -0.05 },
      { label: "Equity −10%", mkt: -0.1 },
      { label: "Equity −20% (crash)", mkt: -0.2 },
      { label: "Equity +10% (rally)", mkt: 0.1 },
    ];
    return shocks.map((s) => {
      const portMove = risk.beta * s.mkt;
      return { label: s.label, pct: portMove * 100, pnl: portMove * risk.totalMV };
    });
  }, [risk]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-px bg-term-border overflow-auto">
      <Panel title="Portfolio Risk Analytics" subtitle={`vs ${BENCH}`} error={!!error} className="min-h-0">
        <DataState loading={loading && positions.length > 0} empty={positions.length === 0 || !risk} rows={8} cols={2}>
          {risk && (
            <div>
              <SectionHead title={`Risk Metrics · ${risk.days}d window`} />
              <Metric label="Portfolio Value" value={fmtCompact(risk.totalMV)} valueClass="text-accent-amber" />
              <Metric label="Annualized Volatility" value={fmtPct(risk.annVol * 100)} />
              <Metric label="1-Day VaR (95%)" value={`${fmtPct(risk.var95 * 100)} · ${fmtCompact(risk.var95 * risk.totalMV)}`} valueClass="down" />
              <Metric label="1-Day VaR (99%)" value={`${fmtPct(risk.var99 * 100)} · ${fmtCompact(risk.var99 * risk.totalMV)}`} valueClass="down" />
              <Metric label="Beta (vs SPY)" value={fmtNum(risk.beta, 2)} />
              <Metric label="Max Drawdown (1Y)" value={fmtPct(risk.maxDrawdown * 100)} valueClass="down" />
              <Metric label="Sharpe (rf=0)" value={fmtNum(risk.sharpe, 2)} valueClass={trendClass(risk.sharpe)} />

              <SectionHead title="Exposure Contribution" />
              <div className="p-2 space-y-1">
                {risk.contributions.map((c) => (
                  <div key={c.symbol} className="flex items-center gap-2">
                    <span className="text-2xs text-term-white w-12">{c.symbol}</span>
                    <div className="flex-1 h-2 bg-bg-secondary">
                      <div className="h-2 bg-accent-amber" style={{ width: `${c.weight * 100}%` }} />
                    </div>
                    <span className="num text-2xs text-term-gray w-10 text-right">{(c.weight * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataState>
      </Panel>

      <Panel title="Stress Testing & Scenarios" className="min-h-0">
        <DataState loading={loading && positions.length > 0} empty={positions.length === 0 || !risk} rows={6} cols={3}>
          {risk && (
            <div>
              <SectionHead title="Beta-Implied Scenario P&L" />
              <table className="w-full text-xs">
                <thead className="text-term-gray text-2xs uppercase">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal">Scenario</th>
                    <th className="num px-2 py-1 font-normal">Port Move</th>
                    <th className="num px-2 py-1 font-normal">Est. P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.label} className="border-b border-term-border/30">
                      <td className="px-2 py-1 text-term-white">{s.label}</td>
                      <td className={`num px-2 py-1 ${trendClass(s.pct)}`}>{fmtPct(s.pct)}</td>
                      <td className={`num px-2 py-1 ${trendClass(s.pnl)}`}>{fmtCompact(s.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-2xs text-term-gray p-2 leading-relaxed">
                VaR is historical (1-year daily returns). Scenario P&L applies portfolio beta to an equity-market shock — a
                first-order approximation. Factor/credit/liquidity risk models require institutional risk-engine data not
                available from free sources.
              </p>
            </div>
          )}
        </DataState>
      </Panel>
    </div>
  );
}
