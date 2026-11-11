import type { Json } from '@/types/database';

function JsonBlock({ title, data }: { title: string; data: Json | null }) {
  if (data === null) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function AuditRawData({
  oldData,
  newData,
}: {
  oldData: Json | null;
  newData: Json | null;
}) {
  if (!oldData && !newData) return null;

  return (
    <details className="rounded-xl border bg-card">
      <summary className="cursor-pointer p-4 text-sm font-medium">
        Raw snapshots
      </summary>
      <div className="space-y-4 border-t p-4">
        <JsonBlock title="Before" data={oldData} />
        <JsonBlock title="After" data={newData} />
      </div>
    </details>
  );
}
