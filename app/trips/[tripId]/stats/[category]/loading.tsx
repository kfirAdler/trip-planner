export default function CategoryStatsLoading() {
  return (
    <div
      className="flex flex-1 animate-pulse flex-col gap-4 px-6 pt-[calc(env(safe-area-inset-top)+2rem)] motion-reduce:animate-none"
      aria-label="Loading places"
      role="status"
    >
      <div className="h-5 w-16 rounded bg-surface-muted" />
      <div className="h-9 w-40 rounded-lg bg-surface-muted" />
      <div className="h-4 w-24 rounded bg-surface-muted" />
      <div className="flex flex-col gap-2 pt-1">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-border bg-surface"
          />
        ))}
      </div>
      <span className="sr-only">Loading places</span>
    </div>
  );
}
