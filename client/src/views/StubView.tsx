import { Panel } from "../components/Panel";
import { FUNCTION_MAP, type FunctionCode } from "../functions";

// Richer explanations for the marquee licensed-data functions. Everything else
// falls back to the catalogue `desc` + `alt`.
const DETAIL: Record<string, { what?: string; why?: string; real?: string }> = {
  DEPTH: {
    what: "Level-2 / market-by-order depth, full order book, bid/ask sizes and venue-level liquidity.",
    why: "Depth-of-book data is licensed per-exchange and not redistributed by free APIs.",
  },
  EXEC: {
    what: "Live order routing, OMS/EMS execution, smart order routing and TCA on real fills.",
    why: "Requires a broker/exchange connection (FIX) and regulatory permissioning.",
  },
  CDS: {
    what: "Credit default swap spreads, CDX/iTraxx indices, issuer credit curves and recovery rates.",
    why: "CDS marks come from licensed dealers / ICE and are not publicly distributed.",
  },
  MBS: {
    what: "Mortgage-backed security analytics: prepayment models, OAS, TBA pricing and pool-level data.",
    why: "MBS analytics require licensed models (e.g. Yield Book) and pool databases.",
  },
  BI: {
    what: "Bloomberg Intelligence: proprietary analyst industry reports, sector outlooks and credit research.",
    why: "BI is original research authored by Bloomberg analysts — not reproducible from market data.",
  },
  ALTD: {
    what: "Alternative data: satellite imagery, shipping/AIS, card-spend, foot-traffic and web-scrape signals.",
    why: "Alt-data vendors license datasets individually at significant cost.",
  },
  BRC: {
    what: "Full-text sell-side broker research reports and price-target notes.",
    why: "Broker research is copyrighted and distributed under entitlement, not via free APIs.",
  },
};

export function StubView({ code }: { code: FunctionCode }) {
  const fn = FUNCTION_MAP[code];
  const d = DETAIL[code] ?? {};
  const what = d.what ?? fn?.desc ?? "";
  const why = d.why ?? "This is proprietary or licensed Bloomberg content and is not redistributed by any free data API.";
  const real = d.real ?? fn?.alt ?? "No public data available for this function.";

  return (
    <Panel title={fn?.label ?? code} subtitle={fn?.category ?? "RESTRICTED"}>
      <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full border border-accent-amber/40 bg-accent-amber/[0.06] flex items-center justify-center text-accent-amber text-lg mb-3">
          ⚠
        </div>
        <div className="border border-accent-orange/60 rounded-full px-3 py-1 text-accent-amber text-2xs uppercase tracking-widest mb-1.5">
          No Public Data Available
        </div>
        <div className="text-2xs text-term-gray mb-5">
          {code} · {fn?.category}
        </div>
        <div className="max-w-md w-full space-y-2.5 text-left">
          <div className="panel-glass !border-t-term-border/60 p-3 rounded-md">
            <div className="text-2xs text-accent-amber uppercase tracking-wide font-semibold">What this is</div>
            <p className="text-xs text-term-white mt-1 leading-relaxed">{what}</p>
          </div>
          <div className="panel-glass !border-t-term-border/60 p-3 rounded-md">
            <div className="text-2xs text-accent-amber uppercase tracking-wide font-semibold">Why it's unavailable here</div>
            <p className="text-xs text-term-gray mt-1 leading-relaxed">{why}</p>
          </div>
          <div className="panel-glass !border-t-term-green/50 p-3 rounded-md">
            <div className="text-2xs text-term-green uppercase tracking-wide font-semibold">Closest available alternative</div>
            <p className="text-xs text-term-green/90 mt-1 leading-relaxed">{real}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
