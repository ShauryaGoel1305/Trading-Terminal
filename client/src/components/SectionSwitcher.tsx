// The three top-level workspaces the whole terminal is organized under.
// Everything reachable from the command bar / function bar lives inside
// "dashboard"; systematic-research tooling lives inside "quant"; the AI
// assistant gets its own full-page home in "ai" (it's also reachable as a
// floating window over the other two — see AiFloatingWindow).
export type Section = "dashboard" | "quant" | "ai";

interface Props {
  section: Section;
  onSelect: (section: Section) => void;
}

const TABS: { key: Section; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "◆" },
  { key: "quant", label: "Quant Lab", icon: "◈" },
  { key: "ai", label: "AI Analyst", icon: "✦" },
];

const ACTIVE_CLASS: Record<Section, string> = {
  dashboard: "bg-gradient-to-r from-accent-orange to-accent-amber text-black shadow-glow-orange",
  quant: "bg-gradient-to-r from-purple-600 to-purple-400 text-black shadow-glow-purple",
  ai: "bg-gradient-to-r from-cyan-500 to-sky-400 text-black shadow-glow-cyan",
};

export function SectionSwitcher({ section, onSelect }: Props) {
  return (
    <div className="flex items-center gap-1 bg-black/40 border border-term-border rounded-full p-1 backdrop-blur-md">
      {TABS.map((t) => {
        const active = section === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              active ? ACTIVE_CLASS[t.key] : "text-term-gray hover:text-term-white hover:bg-white/5"
            }`}
          >
            <span className="text-sm leading-none">{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
