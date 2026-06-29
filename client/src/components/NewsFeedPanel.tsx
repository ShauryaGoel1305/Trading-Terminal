import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtTimeAgo } from "../lib/format";

export function NewsFeedPanel() {
  const { data, loading, error } = usePolling(() => api.news({ limit: 30 }), 20_000, []);

  return (
    <Panel title="News" subtitle="GENERAL" error={!!error && !data}>
      {loading && !data ? (
        <SkeletonRows rows={8} cols={1} />
      ) : (
        <ul className="divide-y divide-term-border/50">
          {(data ?? []).map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block px-2 py-1.5 hover:bg-bg-secondary"
              >
                <div className="text-xs text-term-white leading-snug">{n.headline}</div>
                <div className="flex justify-between text-2xs text-term-gray mt-0.5">
                  <span className="text-accent-amber">{n.source}</span>
                  <span>{fmtTimeAgo(n.datetime)}</span>
                </div>
              </a>
            </li>
          ))}
          {data && data.length === 0 && (
            <li className="p-3 text-2xs text-term-gray">No headlines available.</li>
          )}
        </ul>
      )}
    </Panel>
  );
}
