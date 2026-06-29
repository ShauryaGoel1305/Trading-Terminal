import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
  type HistogramData,
  type LineData,
} from "lightweight-charts";
import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import type { Candle, Timeframe } from "../types";

const TIMEFRAMES: Timeframe[] = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];

const SMA_CONFIG = [
  { period: 20, color: "#ffaa00" },
  { period: 50, color: "#00b3ff" },
  { period: 200, color: "#ff66cc" },
];

function sma(candles: Candle[], period: number): LineData[] {
  if (candles.length < period) return [];
  const out: LineData[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time as UTCTimestamp, value: sum / period });
    }
  }
  return out;
}

interface Props {
  symbol: string;
}

export function ChartPanel({ symbol }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [smaOn, setSmaOn] = useState<Record<number, boolean>>({ 20: true, 50: true, 200: false });

  const { data, loading, error } = usePolling(
    () => api.chart(symbol, timeframe),
    60_000,
    [symbol, timeframe]
  );
  const candles = useMemo(() => data?.candles ?? [], [data]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaRefs = useRef<Record<number, ISeriesApi<"Line">>>({});

  // Create the chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111111" },
        textColor: "#888888",
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#333333", scaleMargins: { top: 0.08, bottom: 0.28 } },
      timeScale: { borderColor: "#333333", timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00ff41",
      downColor: "#ff3333",
      borderUpColor: "#00ff41",
      borderDownColor: "#ff3333",
      wickUpColor: "#00ff41",
      wickDownColor: "#ff3333",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    smaRefs.current = {};
    for (const { period, color } of SMA_CONFIG) {
      smaRefs.current[period] = chart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
    }

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      const el = containerRef.current;
      if (el) chart.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Push data whenever candles change.
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const volData: HistogramData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "rgba(0,255,65,0.4)" : "rgba(255,51,51,0.4)",
    }));

    candleRef.current.setData(candleData);
    volumeRef.current.setData(volData);

    for (const { period } of SMA_CONFIG) {
      const series = smaRefs.current[period];
      if (!series) continue;
      series.setData(smaOn[period] ? sma(candles, period) : []);
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, smaOn]);

  return (
    <Panel
      title={`Chart · ${symbol}`}
      error={!!error && candles.length === 0}
      right={
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {SMA_CONFIG.map(({ period, color }) => (
              <button
                key={period}
                onClick={() => setSmaOn((s) => ({ ...s, [period]: !s[period] }))}
                className={`text-2xs px-1 border ${
                  smaOn[period] ? "border-current" : "border-term-border text-term-gray"
                }`}
                style={smaOn[period] ? { color, borderColor: color } : undefined}
              >
                MA{period}
              </button>
            ))}
          </div>
          <div className="flex gap-px">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`text-2xs px-1.5 py-0.5 ${
                  tf === timeframe
                    ? "bg-accent-orange text-black font-bold"
                    : "text-term-gray hover:text-term-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      }
      bodyClassName="relative"
    >
      <div ref={containerRef} className="absolute inset-0" />
      {loading && candles.length === 0 && (
        <div className="absolute inset-0 bg-bg-panel">
          <SkeletonRows rows={10} cols={1} />
        </div>
      )}
    </Panel>
  );
}
