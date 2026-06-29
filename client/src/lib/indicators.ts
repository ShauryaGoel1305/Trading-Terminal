import type { Candle } from "../types";

export interface Point {
  time: number;
  value: number;
}

export function sma(candles: Candle[], period: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function emaPoints(candles: Candle[], period: number): Point[] {
  const e = ema(candles.map((c) => c.close), period);
  return candles.map((c, i) => ({ time: c.time, value: e[i] }));
}

// Wilder's RSI.
export function rsi(candles: Candle[], period = 14): Point[] {
  if (candles.length <= period) return [];
  const out: Point[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = candles[i].close - candles[i - 1].close;
    if (ch >= 0) avgGain += ch;
    else avgLoss -= ch;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < candles.length; i++) {
    const ch = candles[i].close - candles[i - 1].close;
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
  }
  return out;
}

export interface MacdResult {
  macd: Point[];
  signal: Point[];
  histogram: Point[];
}

export function macd(candles: Candle[], fast = 12, slow = 26, signalP = 9): MacdResult {
  const closes = candles.map((c) => c.close);
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = ema(macdLine, signalP);
  return {
    macd: candles.map((c, i) => ({ time: c.time, value: macdLine[i] })),
    signal: candles.map((c, i) => ({ time: c.time, value: signalLine[i] })),
    histogram: candles.map((c, i) => ({ time: c.time, value: macdLine[i] - signalLine[i] })),
  };
}

export interface Bands {
  upper: Point[];
  middle: Point[];
  lower: Point[];
}

export function bollinger(candles: Candle[], period = 20, mult = 2): Bands {
  const upper: Point[] = [];
  const middle: Point[] = [];
  const lower: Point[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const t = candles[i].time;
    middle.push({ time: t, value: mean });
    upper.push({ time: t, value: mean + mult * sd });
    lower.push({ time: t, value: mean - mult * sd });
  }
  return { upper, middle, lower };
}

// Simple daily log/percentage returns from candles.
export function returns(candles: Candle[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    out.push(candles[i].close / candles[i - 1].close - 1);
  }
  return out;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

// Historical VaR at a given confidence (e.g. 0.95) → fractional loss (positive).
export function historicalVaR(rets: number[], confidence = 0.95): number {
  if (rets.length === 0) return 0;
  const sorted = [...rets].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return -(sorted[idx] ?? sorted[0]);
}

// Beta of an asset vs a benchmark given aligned return series.
export function beta(asset: number[], bench: number[]): number {
  const n = Math.min(asset.length, bench.length);
  if (n < 2) return 0;
  const a = asset.slice(-n);
  const b = bench.slice(-n);
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let cov = 0;
  let varb = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    varb += (b[i] - mb) ** 2;
  }
  return varb === 0 ? 0 : cov / varb;
}

// Wilder's Average True Range — used for volatility-based stop suggestions.
export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let a = trs.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < trs.length; i++) a = (a * (period - 1) + trs[i]) / period;
  return a;
}

// Last value of a Point series (or null when empty).
export function last(points: Point[]): number | null {
  return points.length ? points[points.length - 1].value : null;
}

export function maxDrawdown(candles: Candle[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const c of candles) {
    if (c.close > peak) peak = c.close;
    const dd = peak > 0 ? (c.close - peak) / peak : 0;
    if (dd < mdd) mdd = dd;
  }
  return -mdd;
}
