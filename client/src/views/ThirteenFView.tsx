import { Panel } from "../components/Panel";
import { DataState } from "../components/ui";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// F13 — 13F-HR is filed BY institutional managers, not by the company, so
// there's no per-company 13F. This surfaces managers whose 13F filings
// mention the company (EDGAR full-text search) — real filer names and dates,
// linked to the actual filing for exact position sizes.
export function ThirteenFView({ symbol }: { symbol: string }) {
  const { data, loading, error } = usePolling(() => api.filings13f(symbol), 0, [symbol]);

  return (
    <Panel
      title={`13F Filings · ${symbol}`}
      subtitle="SEC EDGAR full-text search"
      className="h-full"
      bodyClassName="flex flex-col min-h-0"
    >
      <div className="px-3 py-2 text-2xs text-term-gray border-b border-term-border shrink-0">
        13F-HR is filed by institutional <strong className="text-term-white">managers</strong>, not by{" "}
        {data?.companyName ?? "the company"} itself. This lists recent managers whose 13F filings mention it by
        name — open a filing for the exact reported position size.
      </div>
      <DataState loading={loading} error={error} empty={!!data && data.managers.length === 0} rows={12} cols={3}>
        {data && (
          <table className="w-full text-2xs">
            <thead className="sticky top-0 bg-bg-header text-term-gray">
              <tr>
                <th className="px-3 py-1 text-left font-normal">Manager</th>
                <th className="px-3 py-1 text-left font-normal">Period Ending</th>
                <th className="px-3 py-1 text-left font-normal">Filed</th>
                <th className="px-3 py-1 text-right font-normal">Filing</th>
              </tr>
            </thead>
            <tbody>
              {data.managers.map((m) => (
                <tr key={m.cik} className="border-b border-term-border/30 hover:bg-bg-secondary">
                  <td className="px-3 py-1 text-term-white">{m.manager}</td>
                  <td className="px-3 py-1 text-term-gray">{fmtDate(m.periodEnding)}</td>
                  <td className="px-3 py-1 text-term-gray">{fmtDate(m.filingDate)}</td>
                  <td className="px-3 py-1 text-right">
                    <a
                      href={m.indexUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-1.5 py-0.5 border border-term-border text-term-gray hover:text-term-white hover:border-term-white"
                    >
                      Open ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataState>
    </Panel>
  );
}
