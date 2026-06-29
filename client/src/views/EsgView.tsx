import { Panel } from "../components/Panel";

export function EsgView({ symbol }: { symbol: string }) {
  return (
    <Panel title={`ESG · ${symbol}`} subtitle="UNAVAILABLE">
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="border border-accent-orange px-3 py-1 text-accent-amber text-xs uppercase tracking-widest mb-4">
          ⚠ ESG Data Source Unavailable
        </div>
        <div className="max-w-md space-y-3 text-left text-xs">
          <p className="text-term-white">
            ESG scores (environmental, social, governance, controversy level and carbon metrics) come from
            Sustainalytics-derived data. The underlying <code className="text-accent-amber">esgScores</code> module is not
            exposed by the data provider used in this build, so no fabricated scores are shown.
          </p>
          <p className="text-term-gray">
            With a licensed ESG feed (or an alternate Sustainalytics/MSCI source), this panel would render total ESG
            score, the E/S/G sub-scores, controversy level, peer percentile, and carbon-emissions intensity.
          </p>
          <p className="text-term-green">
            Governance-adjacent data that <em>is</em> available is shown under OWN (insider/institutional ownership) and
            DES (board &amp; executive profile).
          </p>
        </div>
      </div>
    </Panel>
  );
}
