export function AdminDataFallback({ label }: { label: string }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
    >
      <div className="h-24 animate-pulse rounded-xl border bg-card" />
      <div className="h-40 animate-pulse rounded-xl border bg-card" />
    </div>
  );
}
