import { useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { SectionHead } from "../components/ui";
import { useQuote } from "../hooks/useQuote";
import { useStore } from "../store";
import { fmtPrice, fmtPct, trendClass } from "../lib/format";

export function TradeView({ symbol }: { symbol: string }) {
  const { data: q } = useQuote(symbol, 15_000);
  const { placeOrder, orders, positions } = useStore();

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(100);
  const [type, setType] = useState<"MKT" | "LMT">("MKT");
  const [limit, setLimit] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const last = q?.price ?? null;
  useEffect(() => {
    if (last != null && type === "LMT" && limit === 0) setLimit(Number(last.toFixed(2)));
  }, [last, type, limit]);

  const heldPosition = positions.find((p) => p.symbol === symbol);

  function submit() {
    const fill = type === "MKT" ? last : limit;
    if (fill == null || fill <= 0) {
      setMsg("No live price to fill against");
      return;
    }
    const err = placeOrder(symbol, side, qty, fill);
    setMsg(err ? `Rejected: ${err}` : `Filled: ${side} ${qty} ${symbol} @ ${fmtPrice(fill)}`);
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-px bg-term-border overflow-auto">
      <Panel title={`Order Entry · ${symbol}`} subtitle="SIMULATED" className="min-h-0">
        <div className="bg-accent-orange/10 border-b border-accent-orange px-2 py-1 text-2xs text-accent-amber">
          PAPER TRADING — no real orders are routed. Fills are simulated at the live market price.
        </div>
        <div className="p-2 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xs text-term-gray">LAST</span>
            <span className="num text-sm text-term-white">{fmtPrice(last)}</span>
            <span className={`num text-2xs ${trendClass(q?.changePercent)}`}>{fmtPct(q?.changePercent)}</span>
          </div>

          <div className="flex gap-px">
            {(["BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 text-xs py-1 font-bold ${
                  side === s ? (s === "BUY" ? "bg-term-green text-black" : "bg-term-red text-black") : "bg-bg-secondary text-term-gray"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="block text-2xs text-term-gray">
            QUANTITY
            <input
              type="number"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value))))}
              className="w-full bg-black border border-term-border px-1 py-0.5 text-term-white num focus:outline-none focus:ring-1 focus:ring-accent-orange"
            />
          </label>

          <div className="flex gap-px">
            {(["MKT", "LMT"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 text-2xs py-0.5 ${type === t ? "bg-accent-orange text-black font-bold" : "bg-bg-secondary text-term-gray"}`}
              >
                {t === "MKT" ? "MARKET" : "LIMIT"}
              </button>
            ))}
          </div>

          {type === "LMT" && (
            <label className="block text-2xs text-term-gray">
              LIMIT PRICE
              <input
                type="number"
                value={limit}
                step={0.01}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full bg-black border border-term-border px-1 py-0.5 text-term-white num focus:outline-none focus:ring-1 focus:ring-accent-orange"
              />
            </label>
          )}

          <div className="flex items-baseline justify-between text-2xs">
            <span className="text-term-gray">EST. VALUE</span>
            <span className="num text-term-white">
              {last != null ? `$${((type === "MKT" ? last : limit) * qty).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
            </span>
          </div>

          <button onClick={submit} className="w-full bg-accent-orange text-black font-bold text-xs py-1.5 hover:bg-accent-amber">
            SUBMIT {side} ORDER
          </button>
          {msg && <div className="text-2xs text-accent-amber">{msg}</div>}
          {heldPosition && (
            <div className="text-2xs text-term-gray">
              Position: {heldPosition.qty} @ {fmtPrice(heldPosition.costBasis)} avg
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Order Blotter" subtitle={`${orders.length}`} className="min-h-0">
        <SectionHead title="Filled Orders (Paper)" />
        {orders.length === 0 ? (
          <div className="p-3 text-2xs text-term-gray">No orders yet.</div>
        ) : (
          <table className="w-full text-2xs">
            <thead className="sticky top-0 bg-bg-header text-term-gray uppercase">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Time</th>
                <th className="px-2 py-1 text-left font-normal">Side</th>
                <th className="px-2 py-1 text-left font-normal">Symbol</th>
                <th className="num px-2 py-1 font-normal">Qty</th>
                <th className="num px-2 py-1 font-normal">Fill</th>
                <th className="num px-2 py-1 font-normal">Value</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-term-border/30">
                  <td className="px-2 py-1 text-term-gray">{new Date(o.ts).toLocaleTimeString("en-US")}</td>
                  <td className={`px-2 py-1 font-bold ${o.side === "BUY" ? "up" : "down"}`}>{o.side}</td>
                  <td className="px-2 py-1 text-accent-amber">{o.symbol}</td>
                  <td className="num px-2 py-1 text-term-white">{o.qty}</td>
                  <td className="num px-2 py-1 text-term-white">{fmtPrice(o.price)}</td>
                  <td className="num px-2 py-1 text-term-gray">${(o.price * o.qty).toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
