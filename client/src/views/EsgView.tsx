import { Panel } from "../components/Panel";

export function EsgView({ symbol }: { symbol: string }) {
  return (
    <Panel title={`ESG · ${symbol}`} subtitle="UNAVAILABLE">
      <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full border border-accent-amber/40 bg-accent-amber/[0.06] flex items-center justify-center text-accent-amber text-lg mb-3">
          ⚠
        </div>
        <div className="border border-accent-orange/60 rounded-full px-3 py-1 text-accent-amber text-2xs uppercase tracking-widest mb-5">
          ESG Data Source Unavailable
        </div>
        <div className="max-w-md w-full space-y-2.5 text-left">
          <div className="panel-glass !border-t-term-border/60 p-3 rounded-md">
            <div className="text-2xs text-accent-amber uppercase tracking-wide font-semibold">What this is</div>
            <p className="text-xs text-term-white mt-1 leading-relaxed">
              ESG scores (environmental, social, governance, controversy level and carbon metrics) come from
              Sustainalytics-derived data. The underlying <code className="text-accent-amber">esgScores</code> module is
              not exposed by the data provider used in this build, so no fabricated scores are shown.
            </p>
          </div>
          <div className="panel-glass !border-t-term-border/60 p-3 rounded-md">
            <div className="text-2xs text-accent-amber uppercase tracking-wide font-semibold">What it would show</div>
            <p className="text-xs text-term-gray mt-1 leading-relaxed">
              With a licensed ESG feed (or an alternate Sustainalytics/MSCI source), this panel would render total ESG
              score, the E/S/G sub-scores, controversy level, peer percentile, and carbon-emissions intensity.
            </p>
          </div>
          <div className="panel-glass !border-t-term-green/50 p-3 rounded-md">
            <div className="text-2xs text-term-green uppercase tracking-wide font-semibold">Closest available alternative</div>
            <p className="text-xs text-term-green/90 mt-1 leading-relaxed">
              Governance-adjacent data that <em>is</em> available is shown under OWN (insider/institutional ownership)
              and DES (board &amp; executive profile).
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
