export default function StatsLoading() {
  return (
    <div
      className="flex flex-1 animate-pulse flex-col gap-6 px-6 pt-[calc(env(safe-area-inset-top)+2rem)] motion-reduce:animate-none"
      aria-label="Loading stats"
      role="status"
    >
      <div className="h-9 w-28 rounded-lg bg-surface-muted" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[7.25rem] rounded-2xl border border-border bg-surface"
          />
        ))}
      </div>
      <span className="sr-only">Loading stats</span>
    </div>
  );
}
