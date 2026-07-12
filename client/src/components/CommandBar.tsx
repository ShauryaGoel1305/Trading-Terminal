import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import type { SearchResult } from "../types";
import { FUNCTIONS, FUNCTION_MAP, isFunctionCode, type FunctionCode } from "../functions";

interface Props {
  onExecute: (symbol: string | undefined, code: FunctionCode | undefined) => void;
}

type Suggestion =
  | { kind: "symbol"; symbol: string; name: string; meta: string }
  | { kind: "function"; code: FunctionCode; label: string; desc: string };

function parseCommand(value: string): { symbol?: string; code?: FunctionCode } {
  const parts = value.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) {
    return isFunctionCode(parts[0]) ? { code: parts[0] as FunctionCode } : { symbol: parts[0] };
  }
  if (isFunctionCode(parts[1])) return { symbol: parts[0], code: parts[1] as FunctionCode };
  if (isFunctionCode(parts[0])) return { code: parts[0] as FunctionCode, symbol: parts[1] };
  return { symbol: parts[0] };
}

export function CommandBar({ onExecute }: Props) {
  const [value, setValue] = useState("");
  const [symbolResults, setSymbolResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the command bar from anywhere.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasSpace = value.includes(" ");
  const fnQuery = hasSpace ? value.trim().split(/\s+/).slice(1).join(" ").toUpperCase() : value.trim().toUpperCase();

  // Symbol autocomplete (only when entering the first token).
  useEffect(() => {
    if (hasSpace) return;
    const q = value.trim();
    if (q.length < 1) {
      setSymbolResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const r = await api.search(q);
        if (!cancelled) setSymbolResults(r);
      } catch {
        if (!cancelled) setSymbolResults([]);
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(id); };
  }, [value, hasSpace]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const fnMatches = FUNCTIONS.filter(
      (f) => f.code.includes(fnQuery) || f.label.toUpperCase().includes(fnQuery)
    ).map<Suggestion>((f) => ({ kind: "function", code: f.code, label: f.label, desc: f.desc }));

    if (hasSpace) return fnMatches.slice(0, 10);

    const symMatches = symbolResults.slice(0, 7).map<Suggestion>((r) => ({
      kind: "symbol",
      symbol: r.symbol,
      name: r.name,
      meta: [r.exchange, r.type].filter(Boolean).join(" · "),
    }));
    // Show function matches too when the token looks like a function.
    return [...symMatches, ...fnMatches.slice(0, 4)];
  }, [symbolResults, fnQuery, hasSpace]);

  function choose(s: Suggestion) {
    if (s.kind === "symbol") {
      const { code } = parseCommand(value);
      onExecute(s.symbol, code);
    } else {
      const { symbol } = parseCommand(value);
      onExecute(symbol, s.code);
    }
    reset();
  }

  function reset() {
    setValue("");
    setSymbolResults([]);
    setOpen(false);
    setActive(0);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[active]) choose(suggestions[active]);
      else {
        const { symbol, code } = parseCommand(value);
        if (symbol || code) onExecute(symbol, code);
        reset();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Escape") {
      reset();
    }
  }

  const showDropdown = open && suggestions.length > 0;
  const parsed = parseCommand(value);
  const hint = parsed.code ? FUNCTION_MAP[parsed.code]?.label : undefined;

  return (
    <div className="px-3 pt-2.5 pb-1.5 bg-transparent">
      {/* Full-viewport dim scrim behind the suggestion dropdown — fixed
          positioning (not nested in any transformed/filtered ancestor) so it
          reliably covers the whole dashboard regardless of DOM nesting, and
          sits below the pill/dropdown's own elevated stacking context. */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40 bg-black/70 animate-fade-in"
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative z-50 flex items-center h-10 rounded-full border bg-bg-panel/95 backdrop-blur-md px-3 transition-all duration-300 ${
          showDropdown ? "border-accent-orange shadow-glow-orange" : "border-term-border hover:border-term-gray"
        }`}
      >
      <span className="text-accent-orange font-bold text-sm mr-2 select-none">{">"}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        placeholder='TICKER + FUNCTION (e.g. "AAPL FA")  ·  press <GO>  ·  "/" to focus'
        className="flex-1 bg-transparent text-term-white text-sm placeholder:text-term-gray focus:outline-none uppercase tracking-wide"
      />
      {hint && <span className="text-2xs text-accent-amber mr-2 whitespace-nowrap animate-fade-in">→ {hint}</span>}
      <kbd className="text-2xs text-term-gray border border-term-border px-1">/</kbd>

      {showDropdown && (
        <ul className="absolute left-0 top-[calc(100%+6px)] z-50 w-full max-h-80 overflow-auto rounded-lg bg-bg-panel/95 backdrop-blur-md border border-accent-orange shadow-glow-orange animate-scale-in origin-top">
          {suggestions.map((s, i) => (
            <li
              key={(s.kind === "symbol" ? s.symbol : s.code) + i}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between px-2 py-1 cursor-pointer text-xs transition-colors duration-150 ${i === active ? "bg-bg-header" : ""}`}
            >
              {s.kind === "symbol" ? (
                <>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-accent-amber font-semibold w-16 shrink-0">{s.symbol}</span>
                    <span className="text-term-gray truncate">{s.name}</span>
                  </span>
                  <span className="text-2xs text-term-gray shrink-0 ml-2">{s.meta}</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-accent-orange font-semibold w-16 shrink-0">{s.code}</span>
                    <span className="text-term-white truncate">{s.label}</span>
                  </span>
                  <span className="text-2xs text-term-gray shrink-0 ml-2">{s.desc}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
