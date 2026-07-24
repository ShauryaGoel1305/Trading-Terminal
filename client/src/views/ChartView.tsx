import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { SkeletonRows } from "../components/Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { bollinger, emaPoints, macd, rsi, sma } from "../lib/indicators";
import type { Candle, Timeframe } from "../types";

const TIMEFRAMES: Timeframe[] = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];
const BASE_LAYOUT = {
  background: { type: ColorType.Solid, color: "#111111" },
  textColor: "#888888",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 10,
};
const GRID = { vertLines: { color: "#1a1a1a" }, horzLines: { color: "#1a1a1a" } };

type Overlay = "bb" | "ema" | "sma";
export type ChartPreset = "gp" | "gip" | "g" | "tech";

// GP/GIP/G/TECH share this view but open with different defaults so they're
// not exact duplicates: GP is the standard daily chart, GIP forces intraday,
// TECH leans into oscillators (Bollinger + RSI/MACD, no moving averages), and
// G is a minimal "quick look" — candles only, nothing computed — which also
// makes it the cheapest of the four to render.
const CHART_PRESETS: Record<ChartPreset, { timeframe: Timeframe; overlays: Record<Overlay, boolean>; rsi: boolean; macd: boolean }> = {
  gp: { timeframe: "6M", overlays: { bb: false, ema: true, sma: true }, rsi: true, macd: true },
  gip: { timeframe: "1D", overlays: { bb: false, ema: true, sma: true }, rsi: true, macd: true },
  tech: { timeframe: "6M", overlays: { bb: true, ema: false, sma: false }, rsi: true, macd: true },
  g: { timeframe: "6M", overlays: { bb: false, ema: false, sma: false }, rsi: false, macd: false },
};
const CHART_LABEL: Record<ChartPreset, string> = {
  gp: "Price Chart",
  gip: "Intraday Chart",
  tech: "Technical Study",
  g: "Quick Chart",
};

export function ChartView({ symbol, preset = "gp" }: { symbol: string; preset?: ChartPreset }) {
  const initial = CHART_PRESETS[preset];
  const [timeframe, setTimeframe] = useState<Timeframe>(initial.timeframe);
  const [overlays, setOverlays] = useState<Record<Overlay, boolean>>(initial.overlays);
  const [showRsi, setShowRsi] = useState(initial.rsi);
  const [showMacd, setShowMacd] = useState(initial.macd);
  const [compare, setCompare] = useState("");
  const [compareInput, setCompareInput] = useState("");

  // Resync defaults when the code (preset) changes — e.g. jumping from GP to
  // TECH on the same symbol should actually change what's on screen.
  useEffect(() => {
    const p = CHART_PRESETS[preset];
    setTimeframe(p.timeframe);
    setOverlays(p.overlays);
    setShowRsi(p.rsi);
    setShowMacd(p.macd);
  }, [preset]);

  const { data, loading, error } = usePolling(() => api.chart(symbol, timeframe), 60_000, [symbol, timeframe]);
  const candles = useMemo(() => data?.candles ?? [], [data]);

  const cmp = usePolling(
    () => (compare ? api.chart(compare, timeframe) : Promise.resolve(null)),
    0,
    [compare, timeframe]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 flex-wrap px-2 py-1 bg-bg-header border-b border-term-border text-2xs">
        <span className="text-accent-amber font-semibold uppercase">{CHART_LABEL[preset]} · {symbol}</span>
        <div className="flex gap-px">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-1.5 py-0.5 ${tf === timeframe ? "bg-accent-orange text-black font-bold" : "text-term-gray hover:text-term-white"}`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["sma", "ema", "bb"] as Overlay[]).map((o) => (
            <button
              key={o}
              onClick={() => setOverlays((s) => ({ ...s, [o]: !s[o] }))}
              className={`px-1 border ${overlays[o] ? "border-accent-amber text-accent-amber" : "border-term-border text-term-gray"}`}
            >
              {o.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setShowRsi((v) => !v)} className={`px-1 border ${showRsi ? "border-accent-amber text-accent-amber" : "border-term-border text-term-gray"}`}>RSI</button>
          <button onClick={() => setShowMacd((v) => !v)} className={`px-1 border ${showMacd ? "border-accent-amber text-accent-amber" : "border-term-border text-term-gray"}`}>MACD</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCompare(compareInput.trim().toUpperCase());
          }}
          className="flex items-center gap-1"
        >
          <input
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value)}
            placeholder="+COMPARE"
            className="bg-black border border-term-border px-1 w-20 text-term-white uppercase focus:outline-none"
          />
          {compare && (
            <button type="button" onClick={() => { setCompare(""); setCompareInput(""); }} className="text-term-red">✕{compare}</button>
          )}
        </form>
        {error && <span className="badge-error">Data Unavailable</span>}
      </div>

      <div className="flex-1 min-h-0 relative">
        {compare ? (
          <ComparePane base={candles} baseSym={symbol} cmp={cmp.data?.candles ?? []} cmpSym={compare} />
        ) : (
          <PricePane candles={candles} overlays={overlays} />
        )}
        {loading && candles.length === 0 && (
          <div className="absolute inset-0 bg-bg-panel"><SkeletonRows rows={10} cols={1} /></div>
        )}
      </div>
      {!compare && showRsi && <div className="h-28 border-t border-term-border"><RsiPane candles={candles} /></div>}
      {!compare && showMacd && <div className="h-28 border-t border-term-border"><MacdPane candles={candles} /></div>}
    </div>
  );
}

// ── Main price pane: candles, volume, SMA/EMA/Bollinger overlays ────────
function PricePane({ candles, overlays }: { candles: Candle[]; overlays: Record<Overlay, boolean> }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Record<string, ISeriesApi<any>>>({});

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: BASE_LAYOUT,
      grid: GRID,
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#333", scaleMargins: { top: 0.08, bottom: 0.28 } },
      timeScale: { borderColor: "#333", timeVisible: true, secondsVisible: false },
    });
    const s = seriesRef.current;
    s.candle = chart.addCandlestickSeries({
      upColor: "#00ff41", downColor: "#ff3333", borderUpColor: "#00ff41",
      borderDownColor: "#ff3333", wickUpColor: "#00ff41", wickDownColor: "#ff3333",
    });
    s.volume = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
    s.volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const line = (color: string, w = 1) => chart.addLineSeries({ color, lineWidth: w as any, priceLineVisible: false, lastValueVisible: false });
    s.sma20 = line("#ffaa00"); s.sma50 = line("#00b3ff"); s.sma200 = line("#ff66cc");
    s.ema12 = line("#00ff41"); s.ema26 = line("#ff8800");
    s.bbU = line("#888"); s.bbM = line("#555"); s.bbL = line("#888");
    chartRef.current = chart;

    const ro = new ResizeObserver(() => ref.current && chart.resize(ref.current.clientWidth, ref.current.clientHeight));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s.candle) return;
    s.candle.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    s.volume.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? "rgba(0,255,65,0.4)" : "rgba(255,51,51,0.4)" })));
    const tp = (pts: { time: number; value: number }[]) => pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
    s.sma20.setData(overlays.sma ? tp(sma(candles, 20)) : []);
    s.sma50.setData(overlays.sma ? tp(sma(candles, 50)) : []);
    s.sma200.setData(overlays.sma ? tp(sma(candles, 200)) : []);
    s.ema12.setData(overlays.ema ? tp(emaPoints(candles, 12)) : []);
    s.ema26.setData(overlays.ema ? tp(emaPoints(candles, 26)) : []);
    const bb = bollinger(candles, 20, 2);
    s.bbU.setData(overlays.bb ? tp(bb.upper) : []);
    s.bbM.setData(overlays.bb ? tp(bb.middle) : []);
    s.bbL.setData(overlays.bb ? tp(bb.lower) : []);
    chartRef.current?.timeScale().fitContent();
  }, [candles, overlays]);

  return <div ref={ref} className="absolute inset-0" />;
}

// ── Relative performance comparison (normalized %) ──────────────────────
function ComparePane({ base, baseSym, cmp, cmpSym }: { base: Candle[]; baseSym: string; cmp: Candle[]; cmpSym: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const aRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: BASE_LAYOUT, grid: GRID, crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#333" }, timeScale: { borderColor: "#333", timeVisible: true },
    });
    aRef.current = chart.addLineSeries({ color: "#ff6600", lineWidth: 2, priceFormat: { type: "percent" } });
    bRef.current = chart.addLineSeries({ color: "#00b3ff", lineWidth: 2, priceFormat: { type: "percent" } });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => ref.current && chart.resize(ref.current.clientWidth, ref.current.clientHeight));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const norm = (cs: Candle[]) => {
      if (cs.length === 0) return [];
      const base0 = cs[0].close;
      return cs.map((c) => ({ time: c.time as UTCTimestamp, value: (c.close / base0 - 1) * 100 }));
    };
    aRef.current?.setData(norm(base));
    bRef.current?.setData(norm(cmp));
    chartRef.current?.timeScale().fitContent();
  }, [base, cmp]);

  return (
    <>
      <div ref={ref} className="absolute inset-0" />
      <div className="absolute top-1 left-2 z-10 text-2xs flex gap-3">
        <span style={{ color: "#ff6600" }}>● {baseSym}</span>
        <span style={{ color: "#00b3ff" }}>● {cmpSym}</span>
        <span className="text-term-gray">relative % (rebased)</span>
      </div>
    </>
  );
}

// ── RSI subchart ────────────────────────────────────────────────────────
function RsiPane({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: BASE_LAYOUT, grid: GRID,
      rightPriceScale: { borderColor: "#333" }, timeScale: { visible: false, borderColor: "#333" },
    });
    const line = chart.addLineSeries({ color: "#ffaa00", lineWidth: 1, priceLineVisible: false });
    line.createPriceLine({ price: 70, color: "#ff3333", lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: "70" });
    line.createPriceLine({ price: 30, color: "#00ff41", lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: "30" });
    lineRef.current = line;
    chartRef.current = chart;
    const ro = new ResizeObserver(() => ref.current && chart.resize(ref.current.clientWidth, ref.current.clientHeight));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    lineRef.current?.setData(rsi(candles, 14).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div className="relative h-full">
      <span className="absolute top-0.5 left-2 z-10 text-2xs text-accent-amber">RSI(14)</span>
      <div ref={ref} className="absolute inset-0" />
    </div>
  );
}

// ── MACD subchart ─────────────────────────────────────────────────────
function MacdPane({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const refs = useRef<{ macd?: ISeriesApi<"Line">; signal?: ISeriesApi<"Line">; hist?: ISeriesApi<"Histogram"> }>({});

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: BASE_LAYOUT, grid: GRID,
      rightPriceScale: { borderColor: "#333" }, timeScale: { visible: false, borderColor: "#333" },
    });
    refs.current.hist = chart.addHistogramSeries({ priceLineVisible: false });
    refs.current.macd = chart.addLineSeries({ color: "#00b3ff", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    refs.current.signal = chart.addLineSeries({ color: "#ff6600", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => ref.current && chart.resize(ref.current.clientWidth, ref.current.clientHeight));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const m = macd(candles);
    const t = (pts: { time: number; value: number }[]) => pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
    refs.current.macd?.setData(t(m.macd));
    refs.current.signal?.setData(t(m.signal));
    refs.current.hist?.setData(m.histogram.map((p) => ({ time: p.time as UTCTimestamp, value: p.value, color: p.value >= 0 ? "rgba(0,255,65,0.5)" : "rgba(255,51,51,0.5)" })));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div className="relative h-full">
      <span className="absolute top-0.5 left-2 z-10 text-2xs text-accent-amber">MACD(12,26,9)</span>
      <div ref={ref} className="absolute inset-0" />
    </div>
  );
}
