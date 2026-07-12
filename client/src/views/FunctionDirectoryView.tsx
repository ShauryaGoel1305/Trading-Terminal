import { useMemo, useState } from "react";
import { CATEGORY_ORDER, FUNCTIONS, type FunctionCode, type FunctionDef } from "../functions";

function StatusBadge({ status }: { status: FunctionDef["status"] }) {
  if (status === "live") {
    return (
      <span className="text-2xs px-1.5 py-0.5 rounded-full border border-term-green/50 bg-term-green/10 text-term-green uppercase font-semibold">
        Live
      </span>
    );
  }
  return (
    <span className="text-2xs px-1.5 py-0.5 rounded-full border border-term-border bg-white/[0.03] text-term-gray uppercase whitespace-nowrap">
      No Public Data
    </span>
  );
}

export function FunctionDirectoryView({
  onSelect,
}: {
  onSelect: (code: FunctionCode) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toUpperCase();

  const filtered = useMemo(
    () =>
      FUNCTIONS.filter(
        (f) =>
          !query ||
          f.code.includes(query) ||
          f.label.toUpperCase().includes(query) ||
          f.desc.toUpperCase().includes(query) ||
          f.category.toUpperCase().includes(query)
      ),
    [query]
  );

  const liveCount = filtered.filter((f) => f.status === "live").length;
  const categories = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: filtered.filter((f) => f.category === cat),
  })).filter((c) => c.items.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-term-border/60 bg-bg-header/70 backdrop-blur-md text-2xs">
        <span className="text-accent-amber font-bold uppercase tracking-wide">Function Finder · FUNC</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="FILTER FUNCTIONS…"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 max-w-xs bg-black/40 border border-term-border rounded-full px-3 py-1 text-term-white uppercase focus:outline-none focus:border-accent-orange focus:shadow-glow-orange transition-all duration-200"
        />
        <span className="text-term-gray">
          {filtered.length} functions · <span className="text-term-green">{liveCount} live</span> ·{" "}
          <span>{filtered.length - liveCount} no public data</span>
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-min">
        {categories.map(({ cat, items }) => (
          <div key={cat} className="panel-glass !border-t-accent-amber/50">
            <div className="px-2.5 py-1.5 text-2xs uppercase tracking-wider text-accent-amber font-semibold border-b border-term-border/50 sticky top-0 z-10 bg-inherit">
              {cat}
            </div>
            <table className="w-full text-xs">
              <tbody>
                {items.map((f) => (
                  <tr
                    key={f.code}
                    onClick={() => onSelect(f.code)}
                    className="border-b border-term-border/30 last:border-0 cursor-pointer transition-colors duration-150 hover:bg-white/[0.04]"
                  >
                    <td className="px-2 py-1 align-top w-16">
                      <span className="text-accent-orange font-semibold">{f.code}</span>
                    </td>
                    <td className="px-2 py-1 align-top">
                      <span className="text-term-white">{f.label}</span>
                      {f.security && <span className="text-2xs text-accent-amber ml-1">·SEC</span>}
                      <div className="text-2xs text-term-gray">{f.desc}</div>
                    </td>
                    <td className="px-2 py-1 align-top text-right">
                      <StatusBadge status={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
