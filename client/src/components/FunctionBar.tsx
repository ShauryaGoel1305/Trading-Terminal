import { FUNCTIONS, type FunctionCode, type FuncGroup } from "../functions";

// "Quant" is a top-level section (see SectionSwitcher), not a group shown
// inline here, so it's intentionally excluded from this bar.
const GROUP_ORDER: FuncGroup[] = ["Monitor", "Security", "Markets", "Portfolio"];

const GROUP_COLOR: Record<FuncGroup, string> = {
  Monitor: "#ffaa00",
  Security: "#ff6600",
  Markets: "#00b3ff",
  Portfolio: "#00ff41",
  Restricted: "#ff3333",
  Quant: "#a855f7",
  AI: "#22d3ee",
};

interface Props {
  active: FunctionCode;
  onSelect: (code: FunctionCode) => void;
}

// The bar shows the pinned (live) functions grouped by domain. Everything else
// — the full catalogue, including the licensed-data stubs — is one click away
// via the FUNC directory.
export function FunctionBar({ active, onSelect }: Props) {
  const pinned = FUNCTIONS.filter((f) => f.pinned);
  return (
    <div className="flex items-stretch h-7 bg-bg-header border-b border-term-border overflow-x-auto text-2xs">
      <button
        onClick={() => onSelect("FUNC")}
        title="FUNC — browse every terminal function"
        className={`px-2 font-bold uppercase whitespace-nowrap border-r border-term-border transition-all duration-200 ${
          active === "FUNC" || active === "MENU"
            ? "bg-accent-orange text-black shadow-glow-orange"
            : "text-accent-amber hover:bg-bg-secondary"
        }`}
      >
        ☰ FUNC
      </button>
      {GROUP_ORDER.map((group) => (
        <div key={group} className="flex items-center border-r border-term-border px-1 gap-px shrink-0">
          <span className="px-1 uppercase tracking-wider hidden xl:inline" style={{ color: GROUP_COLOR[group] }}>
            {group}
          </span>
          {pinned
            .filter((f) => f.group === group)
            .map((f) => (
              <button
                key={f.code}
                onClick={() => onSelect(f.code)}
                title={`${f.code} — ${f.desc}`}
                className={`px-1.5 py-0.5 font-semibold uppercase whitespace-nowrap rounded-sm transition-all duration-200 ${
                  active === f.code
                    ? "bg-accent-orange text-black shadow-glow-orange"
                    : "text-term-gray hover:text-term-white hover:bg-bg-secondary"
                }`}
              >
                {f.code}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
