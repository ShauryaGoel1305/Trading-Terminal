import { useMemo } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtNum } from "../lib/format";
import type { VolatilityResponse } from "../types";

const W = 920;
const H = 240;
const PAD = { l: 40, r: 12, t: 12, b: 22 };

function VolChart({ data }: { data: VolatilityResponse }) {
  const path = useMemo(() => {
    const s = data.series;
    if (s.length < 2) return null;
    const vols = s.map((p) => p.vol);
    const min = Math.min(...vols);
    const max = Math.max(...vols);
    const span = max - min || 1;
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const x = (i: number) => PAD.l + (i / (s.length - 1)) * innerW;
    const y = (v: number) => PAD.t + innerH - ((v - min) / span) * innerH;
    const d = s.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.vol).toFixed(1)}`).join(" ");
    // y-axis ticks
    const ticks = [min, min + span / 2, max].map((v) => ({ v, y: y(v) }));
    // x labels: first, middle, last dates
    const xs = [0, Math.floor((s.length - 1) / 2), s.length - 1].map((i) => ({ label: s[i].date, x: x(i) }));
    return { d, ticks, xs, lastX: x(s.length - 1), lastY: y(s[s.length - 1].vol) };
  }, [data.series]);

  if (!path) return <div className="p-4 text-2xs text-term-gray">Not enough history to chart.</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ maxHeight: 260 }}>
      {path.ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="#333333" strokeWidth={0.5} />
          <text x={PAD.l - 4} y={t.y + 3} textAnchor="end" fontSize={9} fill="#888888">{t.v.toFixed(0)}%</text>
        </g>
      ))}
      {path.xs.map((t, i) => (
        <text key={i} x={t.x} y={H - 6} textAnchor={i === 0 ? "start" : i === path.xs.length - 1 ? "end" : "middle"} fontSize={9} fill="#888888">{t.label}</text>
      ))}
      <path d={path.d} fill="none" stroke="#ffaa00" strokeWidth={1.2} />
      <circle cx={path.lastX} cy={path.lastY} r={2.5} fill="#ffaa00" />
    </svg>
  );
}

export function VolatilityView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.volatility(symbol), 0, [symbol]);

  return (
    <Panel title={`Historical Volatility · ${symbol}`} subtitle="Realized vol (annualized)" error={!!error}
      className="h-full" bodyClassName="flex flex-col min-h-0">
      <DataState loading={loading} error={error} rows={10} cols={3}>
        {data && (
          <div className="flex flex-col min-h-0 flex-1 overflow-auto">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-2xs border-b border-term-border shrink-0">
              {data.windows.map((w) => (
                <Stat key={w.days} label={`${w.days}d`} value={`${w.vol.toFixed(1)}%`}
                  valueClass={w.days === 30 ? "text-accent-amber" : "text-term-white"} />
              ))}
            </div>
            <SectionHead title="30-Day Rolling Volatility (2yr)" />
            <div className="px-2 pb-2"><VolChart data={data} /></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-term-border">
              <div className="bg-bg-panel"><Metric label="Current 30d Vol" value={data.current30 == null ? "—" : `${data.current30.toFixed(1)}%`} valueClass="text-accent-amber" /></div>
              <div className="bg-bg-panel"><Metric label="2yr Avg 30d" value={data.avg30 == null ? "—" : `${data.avg30.toFixed(1)}%`} /></div>
              <div className="bg-bg-panel"><Metric label="2yr Min / Max" value={`${fmtNum(data.min30, 1)}% / ${fmtNum(data.max30, 1)}%`} /></div>
              <div className="bg-bg-panel"><Metric label="2yr Price Range" value={`$${fmtNum(data.priceLow)}–$${fmtNum(data.priceHigh)}`} /></div>
            </div>
            <div className="p-3 text-2xs text-term-gray leading-relaxed border-t border-term-border">
              Realized volatility = annualized standard deviation of daily log returns (×√252). The chart shows the
              trailing 30-trading-day window. This is <span className="text-term-white">historical</span> vol, not
              option-implied vol (which needs a live options surface). Source: Yahoo daily closes.
            </div>
          </div>
        )}
      </DataState>
    </Panel>
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
