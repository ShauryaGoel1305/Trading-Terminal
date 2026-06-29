import { useState } from "react";
import { Panel } from "../components/Panel";
import { SectionHead } from "../components/ui";
import { useMarketData } from "../hooks/useMarketData";
import { useStore } from "../store";
import { fmtPrice } from "../lib/format";

export function AlertsView({ symbol }: { symbol: string }) {
  const { alerts, addAlert, removeAlert } = useStore();
  const [sym, setSym] = useState(symbol);
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [value, setValue] = useState(0);

  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  const { data } = useMarketData(symbols, 30_000);
  const priceOf = new Map((data ?? []).map((q) => [q.symbol, q.price]));

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-px bg-term-border overflow-auto">
      <Panel title="Create Alert" className="min-h-0">
        <div className="p-2 space-y-2 text-2xs">
          <label className="block text-term-gray">
            SYMBOL
            <input
              value={sym}
              onChange={(e) => setSym(e.target.value.toUpperCase())}
              className="w-full bg-black border border-term-border px-1 py-0.5 text-term-white uppercase focus:outline-none focus:ring-1 focus:ring-accent-orange"
            />
          </label>
          <div className="flex gap-px">
            {(["above", "below"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={`flex-1 py-1 uppercase ${condition === c ? "bg-accent-orange text-black font-bold" : "bg-bg-secondary text-term-gray"}`}
              >
                {c === "above" ? "▲ Above" : "▼ Below"}
              </button>
            ))}
          </div>
          <label className="block text-term-gray">
            PRICE
            <input
              type="number"
              value={value}
              step={0.01}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full bg-black border border-term-border px-1 py-0.5 text-term-white num focus:outline-none focus:ring-1 focus:ring-accent-orange"
            />
          </label>
          <button
            onClick={() => {
              addAlert(sym, condition, value);
              setValue(0);
            }}
            className="w-full bg-accent-orange text-black font-bold py-1.5 hover:bg-accent-amber"
          >
            ADD ALERT
          </button>
          <p className="text-term-gray pt-1">
            Alerts are checked against live quotes every 30s while the terminal is open and trigger a browser notification.
          </p>
        </div>
      </Panel>

      <Panel title="Active Alerts" subtitle={`${alerts.length}`} className="min-h-0">
        <SectionHead title="Alerts" />
        {alerts.length === 0 ? (
          <div className="p-3 text-2xs text-term-gray">No alerts set.</div>
        ) : (
          <table className="w-full text-2xs">
            <thead className="text-term-gray uppercase">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Symbol</th>
                <th className="px-2 py-1 text-left font-normal">Condition</th>
                <th className="num px-2 py-1 font-normal">Target</th>
                <th className="num px-2 py-1 font-normal">Last</th>
                <th className="px-2 py-1 text-left font-normal">Status</th>
                <th className="px-1"></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-term-border/30 group">
                  <td className="px-2 py-1 text-accent-amber font-semibold">{a.symbol}</td>
                  <td className="px-2 py-1 text-term-white">{a.condition === "above" ? "▲ above" : "▼ below"}</td>
                  <td className="num px-2 py-1 text-term-white">{fmtPrice(a.value)}</td>
                  <td className="num px-2 py-1 text-term-gray">{fmtPrice(priceOf.get(a.symbol) ?? null)}</td>
                  <td className="px-2 py-1">
                    {a.triggered ? <span className="text-term-green">● TRIGGERED</span> : <span className="text-term-gray">○ armed</span>}
                  </td>
                  <td className="px-1">
                    <button onClick={() => removeAlert(a.id)} className="opacity-0 group-hover:opacity-100 text-term-red">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
