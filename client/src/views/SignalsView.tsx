import { useEffect, useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { DataState, Metric, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { atr, bollinger, last, macd, returns, rsi, sma, stdev } from "../lib/indicators";
import { fmtPct, fmtPrice } from "../lib/format";

type Verdict = "bullish" | "bearish" | "neutral";
const V_CLASS: Record<Verdict, string> = { bullish: "up", bearish: "down", neutral: "flat" };
const V_LABEL: Record<Verdict, string> = { bullish: "BULLISH", bearish: "BEARISH", neutral: "NEUTRAL" };

function pctFrac(v: number | null | undefined) {
  return v == null ? "—" : fmtPct(v * 100);
}

function VerdictChip({ v }: { v: Verdict }) {
  return (
    <span className={`text-2xs px-1 border uppercase ${V_CLASS[v]}`} style={{ borderColor: "currentColor" }}>
      {V_LABEL[v]}
    </span>
  );
}

function SignalRow({ label, detail, v }: { label: string; detail: string; v: Verdict }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-term-border/40 gap-2">
      <span className="text-2xs text-term-gray uppercase w-40 shrink-0">{label}</span>
      <span className="num text-2xs text-term-white flex-1 text-right">{detail}</span>
      <span className="w-16 text-right"><VerdictChip v={v} /></span>
    </div>
  );
}

export function SignalsView({ symbol }: { symbol: string }) {
  const chart = usePolling(() => api.chart(symbol, "1Y"), 60_000, [symbol]);
  const fun = usePolling(() => api.fundamentals(symbol), 0, [symbol]);

  const candles = chart.data?.candles ?? [];
  const stats = fun.data?.stats ?? {};
  const analyst = fun.data?.analyst;

  const sig = useMemo(() => {
    if (candles.length < 60) return null;
    const price = candles[candles.length - 1].close;
    const sma20 = last(sma(candles, 20));
    const sma50 = last(sma(candles, 50));
    const sma200 = last(sma(candles, 200));
    const rsiVal = last(rsi(candles, 14));
    const m = macd(candles);
    const macdHist = m.histogram.length ? m.histogram[m.histogram.length - 1].value : 0;
    const bb = bollinger(candles, 20, 2);
    const bbU = last(bb.upper);
    const bbL = last(bb.lower);
    const atrVal = atr(candles, 14);
    const hi52 = Math.max(...candles.map((c) => c.high));
    const lo52 = Math.min(...candles.map((c) => c.low));
    const pos52 = hi52 > lo52 ? ((price - lo52) / (hi52 - lo52)) * 100 : 50;
    const vol = stdev(returns(candles)) * Math.sqrt(252) * 100;

    const signals: { label: string; detail: string; v: Verdict }[] = [];
    if (sma200 != null)
      signals.push({ label: "Trend vs SMA200", detail: `${fmtPrice(price)} vs ${fmtPrice(sma200)}`, v: price > sma200 ? "bullish" : "bearish" });
    if (sma50 != null && sma200 != null)
      signals.push({ label: "SMA50 / SMA200", detail: sma50 > sma200 ? "Golden cross" : "Death cross", v: sma50 > sma200 ? "bullish" : "bearish" });
    if (sma20 != null)
      signals.push({ label: "Price vs SMA20", detail: `${fmtPrice(price)} vs ${fmtPrice(sma20)}`, v: price > sma20 ? "bullish" : "bearish" });
    if (rsiVal != null)
      signals.push({ label: "RSI (14)", detail: rsiVal.toFixed(1) + (rsiVal > 70 ? " overbought" : rsiVal < 30 ? " oversold" : ""), v: rsiVal < 30 ? "bullish" : rsiVal > 70 ? "bearish" : "neutral" });
    signals.push({ label: "MACD (12,26,9)", detail: `hist ${macdHist.toFixed(2)}`, v: macdHist > 0 ? "bullish" : macdHist < 0 ? "bearish" : "neutral" });
    if (bbU != null && bbL != null)
      signals.push({ label: "Bollinger (20,2)", detail: price > bbU ? "above upper" : price < bbL ? "below lower" : "in band", v: price < bbL ? "bullish" : price > bbU ? "bearish" : "neutral" });
    signals.push({ label: "52W Range Position", detail: `${pos52.toFixed(0)}%`, v: pos52 > 80 ? "bullish" : pos52 < 20 ? "bearish" : "neutral" });
    if (analyst?.recommendationKey) {
      const k = analyst.recommendationKey.toLowerCase();
      const v: Verdict = k.includes("buy") ? "bullish" : k.includes("sell") || k.includes("underperform") ? "bearish" : "neutral";
      signals.push({ label: "Analyst Consensus", detail: analyst.recommendationKey.replace(/_/g, " "), v });
    }
    if (analyst?.targetMean != null) {
      const up = ((analyst.targetMean - price) / price) * 100;
      signals.push({ label: "Analyst Target", detail: `${fmtPrice(analyst.targetMean)} (${fmtPct(up)})`, v: up > 5 ? "bullish" : up < -5 ? "bearish" : "neutral" });
    }

    const score = signals.reduce((s, x) => s + (x.v === "bullish" ? 1 : x.v === "bearish" ? -1 : 0), 0);
    const gauge = Math.round(((score / signals.length) + 1) / 2 * 100);
    const overall: Verdict = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

    return { price, sma20, sma50, sma200, atrVal, hi52, lo52, pos52, vol, signals, score, gauge, overall };
  }, [candles, analyst]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-px bg-term-border overflow-auto">
      {/* LEFT: signals + key levels */}
      <div className="flex flex-col gap-px">
        <Panel title={`Trade Signals · ${symbol}`} error={!!chart.error} className="min-h-0">
          <DataState loading={chart.loading && candles.length === 0} error={chart.error} empty={!sig} rows={10} cols={2}>
            {sig && (
              <div>
                <div className="flex items-center justify-between px-2 py-2 border-b border-term-border bg-bg-secondary">
                  <div>
                    <div className="text-2xs text-term-gray uppercase">Composite Signal</div>
                    <div className={`text-lg font-bold ${V_CLASS[sig.overall]}`}>{V_LABEL[sig.overall]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xs text-term-gray uppercase">Score</div>
                    <div className="num text-lg text-term-white">{sig.gauge}<span className="text-2xs text-term-gray">/100</span></div>
                  </div>
                </div>
                {/* gauge bar */}
                <div className="px-2 py-2 border-b border-term-border">
                  <div className="h-2 bg-bg-secondary relative">
                    <div
                      className="h-2 absolute top-0 left-0"
                      style={{ width: `${sig.gauge}%`, background: sig.overall === "bullish" ? "#00ff41" : sig.overall === "bearish" ? "#ff3333" : "#ffaa00" }}
                    />
                  </div>
                  <div className="flex justify-between text-2xs text-term-gray mt-0.5">
                    <span>Bearish</span><span>Neutral</span><span>Bullish</span>
                  </div>
                </div>
                {sig.signals.map((s) => (
                  <SignalRow key={s.label} label={s.label} detail={s.detail} v={s.v} />
                ))}
              </div>
            )}
          </DataState>
        </Panel>

        <Panel title="Key Levels" className="min-h-0">
          <DataState loading={chart.loading && candles.length === 0} empty={!sig} rows={6} cols={2}>
            {sig && (
              <div>
                <Metric label="Last Price" value={fmtPrice(sig.price)} />
                <Metric label="52-Week High" value={fmtPrice(sig.hi52)} valueClass={`down`} />
                <Metric label="52-Week Low" value={fmtPrice(sig.lo52)} valueClass={`up`} />
                <Metric label="SMA 20 / 50 / 200" value={`${fmtPrice(sig.sma20)} · ${fmtPrice(sig.sma50)} · ${fmtPrice(sig.sma200)}`} />
                <Metric label="ATR (14)" value={fmtPrice(sig.atrVal)} />
                <Metric label="Suggested Stop (2·ATR)" value={fmtPrice(sig.price - 2 * sig.atrVal)} valueClass="down" />
                <Metric label="Annualized Volatility" value={fmtPct(sig.vol)} />
              </div>
            )}
          </DataState>
        </Panel>
      </div>

      {/* RIGHT: valuation + analyst + calculator */}
      <div className="flex flex-col gap-px">
        <Panel title="Valuation & Quality" error={!!fun.error} className="min-h-0">
          <DataState loading={fun.loading} error={fun.error} rows={8} cols={2}>
            {fun.data && (
              <div>
                <Metric label="Trailing P/E" value={stats.trailingPE != null ? stats.trailingPE.toFixed(1) : "—"} />
                <Metric label="Forward P/E" value={stats.forwardPE != null ? stats.forwardPE.toFixed(1) : "—"} />
                <Metric label="PEG Ratio" value={stats.pegRatio != null ? stats.pegRatio.toFixed(2) : "—"} />
                <Metric label="Price / Book" value={stats.priceToBook != null ? stats.priceToBook.toFixed(2) : "—"} />
                <Metric label="Profit Margin" value={pctFrac(stats.profitMargin)} valueClass={(stats.profitMargin ?? 0) > 0 ? "up" : "down"} />
                <Metric label="Return on Equity" value={pctFrac(stats.roe)} />
                <Metric label="Revenue Growth" value={pctFrac(stats.revenueGrowth)} valueClass={(stats.revenueGrowth ?? 0) >= 0 ? "up" : "down"} />
                <Metric label="Earnings Growth" value={pctFrac(stats.earningsGrowth)} valueClass={(stats.earningsGrowth ?? 0) >= 0 ? "up" : "down"} />
                <Metric label="Debt / Equity" value={stats.debtToEquity != null ? stats.debtToEquity.toFixed(0) : "—"} />
                <Metric label="Beta" value={stats.beta != null ? stats.beta.toFixed(2) : "—"} />
                <Metric label="Dividend Yield" value={pctFrac(stats.dividendYield)} />
                <Metric
                  label="Next Earnings"
                  value={fun.data.nextEarningsDate ? new Date(fun.data.nextEarningsDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "—"}
                  valueClass="text-accent-amber"
                />
              </div>
            )}
          </DataState>
        </Panel>

        <RiskRewardCalc price={sig?.price ?? null} atrVal={sig?.atrVal ?? 0} target={analyst?.targetMean ?? null} />
      </div>
    </div>
  );
}

// ── Position sizing & risk/reward calculator ────────────────────────────────
function RiskRewardCalc({ price, atrVal, target }: { price: number | null; atrVal: number; target: number | null }) {
  const [acct, setAcct] = useState("25000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [tgt, setTgt] = useState("");

  // Seed sensible defaults once price/ATR are known.
  useEffect(() => {
    if (price && !entry) {
      setEntry(price.toFixed(2));
      setStop((price - 2 * atrVal).toFixed(2));
      setTgt(((target && target > price ? target : price + 4 * atrVal)).toFixed(2));
    }
  }, [price, atrVal, target, entry]);

  const a = parseFloat(acct) || 0;
  const rp = (parseFloat(riskPct) || 0) / 100;
  const e = parseFloat(entry) || 0;
  const s = parseFloat(stop) || 0;
  const t = parseFloat(tgt) || 0;

  const riskPerShare = e - s;
  const rewardPerShare = t - e;
  const riskBudget = a * rp;
  const shares = riskPerShare > 0 ? Math.floor(riskBudget / riskPerShare) : 0;
  const riskAmt = shares * riskPerShare;
  const rewardAmt = shares * rewardPerShare;
  const rr = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;
  const posValue = shares * e;
  const pctAcct = a > 0 ? (posValue / a) * 100 : 0;

  const field = (label: string, val: string, setter: (v: string) => void) => (
    <label className="flex items-center justify-between px-2 py-1 border-b border-term-border/40 gap-2">
      <span className="text-2xs text-term-gray uppercase">{label}</span>
      <input
        value={val}
        onChange={(e) => setter(e.target.value)}
        inputMode="decimal"
        className="num bg-black border border-term-border px-1 w-24 text-term-white text-right focus:outline-none focus:ring-1 focus:ring-accent-orange"
      />
    </label>
  );

  return (
    <Panel title="Risk / Reward & Position Size" className="min-h-0">
      <div className="grid grid-cols-2">
        <div>
          <SectionHead title="Inputs" />
          {field("Account ($)", acct, setAcct)}
          {field("Risk per trade (%)", riskPct, setRiskPct)}
          {field("Entry", entry, setEntry)}
          {field("Stop", stop, setStop)}
          {field("Target", tgt, setTgt)}
        </div>
        <div>
          <SectionHead title="Result" />
          <Metric label="Risk / Share" value={fmtPrice(riskPerShare)} valueClass="down" />
          <Metric label="Reward / Share" value={fmtPrice(rewardPerShare)} valueClass="up" />
          <Metric label="R : R Ratio" value={rr > 0 ? `${rr.toFixed(2)} : 1` : "—"} valueClass={rr >= 2 ? "up" : rr > 0 ? "flat" : "down"} />
          <Metric label="Shares" value={shares.toLocaleString()} valueClass="text-accent-amber" />
          <Metric label="Position Value" value={fmtPrice(posValue)} />
          <Metric label="% of Account" value={fmtPct(pctAcct)} />
          <Metric label="Risk Amount" value={fmtPrice(riskAmt)} valueClass="down" />
          <Metric label="Reward Amount" value={fmtPrice(rewardAmt)} valueClass="up" />
        </div>
      </div>
    </Panel>
  );
}
