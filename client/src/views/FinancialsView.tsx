import { useState } from "react";
import { Panel } from "../components/Panel";
import { DataState, SectionHead } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtCompact } from "../lib/format";
import type { StatementLine } from "../types";

function StatementTable({ title, lines, periods }: { title: string; lines: StatementLine[]; periods: string[] }) {
  return (
    <div>
      <SectionHead title={title} />
      <table className="w-full text-2xs">
        <thead>
          <tr className="text-term-gray">
            <th className="px-2 py-1 text-left font-normal">USD</th>
            {periods.map((p) => (
              <th key={p} className="num px-2 py-1 font-normal">{p.slice(0, 7)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key} className="border-b border-term-border/30 hover:bg-bg-secondary">
              <td className="px-2 py-1 text-term-white whitespace-nowrap">{line.label}</td>
              {line.values.map((v, i) => (
                <td key={i} className={`num px-2 py-1 ${v != null && v < 0 ? "down" : "text-term-gray"}`}>
                  {v == null ? "—" : fmtCompact(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinancialsView({ symbol }: { symbol: string }) {
  const [type, setType] = useState<"annual" | "quarterly">("annual");
  const { data, loading, error } = usePolling(() => api.financials(symbol, type), 0, [symbol, type]);

  return (
    <Panel
      title={`Financials · ${symbol}`}
      error={!!error}
      right={
        <div className="flex gap-px">
          {(["annual", "quarterly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`text-2xs px-2 py-0.5 uppercase ${
                t === type ? "bg-accent-orange text-black font-bold" : "text-term-gray hover:text-term-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      <DataState loading={loading} error={error} empty={!!data && data.periods.length === 0} rows={14} cols={5}>
        {data && (
          <div>
            <StatementTable title="Income Statement" lines={data.income} periods={data.periods} />
            <StatementTable title="Balance Sheet" lines={data.balance} periods={data.periods} />
            <StatementTable title="Cash Flow" lines={data.cashflow} periods={data.periods} />
          </div>
        )}
      </DataState>
    </Panel>
  );
}
