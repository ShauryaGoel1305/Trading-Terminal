import { useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtNum, trendClass } from "../lib/format";

const FACE = 100;

function bondMetrics(couponPct: number, years: number, freq: number, yieldPct: number) {
  const N = Math.round(years * freq);
  const cpn = (FACE * couponPct) / 100 / freq;
  const i = yieldPct / 100 / freq;
  let price = 0;
  let dur = 0;
  let conv = 0;
  for (let t = 1; t <= N; t++) {
    const cf = t === N ? cpn + FACE : cpn;
    const pv = cf / Math.pow(1 + i, t);
    price += pv;
    dur += t * pv;
    conv += t * (t + 1) * pv;
  }
  const macaulay = price > 0 ? dur / price / freq : 0;
  const modified = macaulay / (1 + i);
  const convexity = price > 0 ? conv / (price * Math.pow(1 + i, 2) * freq * freq) : 0;
  return { price, macaulay, modified, convexity };
}

function ytmFromPrice(couponPct: number, years: number, freq: number, target: number) {
  let lo = 0;
  let hi = 50;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const p = bondMetrics(couponPct, years, freq, mid).price;
    if (p > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function YieldCurveView() {
  const { data, loading, error } = usePolling(() => api.curve(), 60_000, []);

  const [coupon, setCoupon] = useState(5);
  const [years, setYears] = useState(10);
  const [freq, setFreq] = useState(2);
  const [yld, setYld] = useState(4.5);
  const [priceInput, setPriceInput] = useState(100);

  const metrics = useMemo(() => bondMetrics(coupon, years, freq, yld), [coupon, years, freq, yld]);
  const solvedYtm = useMemo(() => ytmFromPrice(coupon, years, freq, priceInput), [coupon, years, freq, priceInput]);

  const pts = data?.points ?? [];
  const maxY = Math.max(...pts.map((p) => p.yield ?? 0), 1);
  const minY = Math.min(...pts.map((p) => p.yield ?? 0), 0);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-px bg-term-border overflow-auto">
      <Panel title="US Treasury Yield Curve" error={!!error} className="min-h-0">
        <DataState loading={loading} error={error} rows={6} cols={2}>
          {data && (
            <div>
              {/* simple SVG curve */}
              <div className="p-3">
                <svg viewBox="0 0 300 120" className="w-full h-32">
                  <polyline
                    fill="none"
                    stroke="#ff6600"
                    strokeWidth="1.5"
                    points={pts
                      .map((p, i) => {
                        const x = (i / Math.max(pts.length - 1, 1)) * 280 + 10;
                        const range = maxY - minY || 1;
                        const y = 110 - (((p.yield ?? 0) - minY) / range) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {pts.map((p, i) => {
                    const x = (i / Math.max(pts.length - 1, 1)) * 280 + 10;
                    const range = maxY - minY || 1;
                    const y = 110 - (((p.yield ?? 0) - minY) / range) * 100;
                    return (
                      <g key={p.label}>
                        <circle cx={x} cy={y} r="2.5" fill="#ffaa00" />
                        <text x={x} y={118} fontSize="7" fill="#888" textAnchor="middle">{p.label}</text>
                        <text x={x} y={y - 5} fontSize="7" fill="#fff" textAnchor="middle">{fmtNum(p.yield, 2)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <SectionHead title="Tenors" />
              <table className="w-full text-xs">
                <thead className="text-term-gray text-2xs uppercase">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal">Tenor</th>
                    <th className="num px-2 py-1 font-normal">Yield %</th>
                    <th className="num px-2 py-1 font-normal">Chg</th>
                  </tr>
                </thead>
                <tbody>
                  {pts.map((p) => (
                    <tr key={p.label} className="border-b border-term-border/30">
                      <td className="px-2 py-1 text-accent-amber">{p.label}</td>
                      <td className="num px-2 py-1 text-term-white">{fmtNum(p.yield, 3)}</td>
                      <td className={`num px-2 py-1 ${trendClass(p.change)}`}>{fmtNum(p.change, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-2 py-1 text-2xs text-term-gray">
                2s10s-style slope ({pts[pts.length - 1]?.label} − {pts[0]?.label}):{" "}
                <span className={trendClass((pts[pts.length - 1]?.yield ?? 0) - (pts[0]?.yield ?? 0))}>
                  {fmtNum((pts[pts.length - 1]?.yield ?? 0) - (pts[0]?.yield ?? 0), 2)}%
                </span>
              </div>
            </div>
          )}
        </DataState>
      </Panel>

      <Panel title="Bond Analytics Calculator" className="min-h-0">
        <div className="p-2 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-2xs">
            <Field label="Coupon %" value={coupon} onChange={setCoupon} step={0.125} />
            <Field label="Maturity (yrs)" value={years} onChange={setYears} step={1} />
            <Field label="Frequency /yr" value={freq} onChange={setFreq} step={1} />
            <Field label="Yield %" value={yld} onChange={setYld} step={0.05} />
          </div>
          <SectionHead title="Results (Face 100)" />
          <Metric label="Clean Price" value={fmtNum(metrics.price, 4)} valueClass="text-accent-amber" />
          <Metric label="Macaulay Duration" value={`${fmtNum(metrics.macaulay, 3)} yrs`} />
          <Metric label="Modified Duration" value={fmtNum(metrics.modified, 3)} />
          <Metric label="Convexity" value={fmtNum(metrics.convexity, 3)} />
          <Metric label="DV01 (per 100)" value={fmtNum((metrics.modified * metrics.price) / 10000, 4)} />

          <SectionHead title="Solve Yield from Price" />
          <div className="grid grid-cols-2 gap-2 text-2xs items-center">
            <Field label="Market Price" value={priceInput} onChange={setPriceInput} step={0.5} />
            <Metric label="Implied YTM %" value={fmtNum(solvedYtm, 4)} valueClass="text-accent-amber" />
          </div>
          <p className="text-2xs text-term-gray pt-1">
            Analytics computed locally from inputs. Live CDS, MBS and municipal pricing require a licensed data feed (see Restricted functions).
          </p>
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step: number }) {
  return (
    <label className="flex flex-col gap-0.5 text-term-gray">
      <span className="uppercase">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-black border border-term-border px-1 py-0.5 text-term-white num focus:outline-none focus:ring-1 focus:ring-accent-orange"
      />
    </label>
  );
}
