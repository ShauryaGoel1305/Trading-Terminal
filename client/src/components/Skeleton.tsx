export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2" style={{ animationDelay: `${r * 80}ms` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton-bar h-3 flex-1"
              style={{ animationDelay: `${(r + c) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-bar ${className}`} />;
}
