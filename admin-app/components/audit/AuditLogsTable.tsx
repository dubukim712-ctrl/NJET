'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { AuditLog } from '@/types/database';
import { formatAuditDate, getAuditFieldChanges, shortAuditId } from '@/lib/audit';
import { clearAuditLogsAction } from '@/data/actions/audit';
import { useInvalidateAdminAuditLogsQuery } from '@/data/audit/admin-audit-logs-client';
import { AuditActionBadge } from '@/components/audit/AuditActionBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AuditLogsTableProps {
  logs: AuditLog[];
  canClear?: boolean;
  detailBasePath?: string;
}

type ClearMode = 'all' | 'selected' | null;

export function AuditLogsTable({
  logs,
  canClear = false,
  detailBasePath = '/admin/audit-logs',
}: AuditLogsTableProps) {
  const router = useRouter();
  const invalidateAuditLogs = useInvalidateAdminAuditLogsQuery();
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: '',
    ids: [],
  });
  const [clearMode, setClearMode] = useState<ClearMode>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailHref = (id: string) => `${detailBasePath}/${id}`;
  const visibleIds = logs.map((log) => log.id);
  const selectionKey = visibleIds.join(':');
  const selectedIds =
    selection.key === selectionKey ? selection.ids : [];
  const allSelected =
    logs.length > 0 && selectedIds.length === logs.length;

  const toggleOne = (id: string, checked: boolean) => {
    setSelection((current) => {
      const currentIds =
        current.key === selectionKey ? current.ids : [];
      return {
        key: selectionKey,
        ids: checked
          ? [...currentIds, id]
          : currentIds.filter((selectedId) => selectedId !== id),
      };
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelection({ key: selectionKey, ids: checked ? visibleIds : [] });
  };

  const clearLogs = async () => {
    if (!clearMode) return;

    setError(null);
    setLoading(true);
    try {
      const result = await clearAuditLogsAction(
        clearMode === 'all' ? null : selectedIds
      );

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      const count = result.data.deletedCount;
      if (count > 0) {
        toast.success(
          `${count} audit record${count === 1 ? '' : 's'} deleted.`
        );
      } else {
        toast.info('No matching audit records were found.');
      }
      setSelection({ key: selectionKey, ids: [] });
      setClearMode(null);
      await invalidateAuditLogs();
      router.refresh();
    } catch {
      const message = 'Could not clear the audit logs. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {canClear && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} selected on this page. Clear all removes every
            record, regardless of filters.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={selectedIds.length === 0 || loading}
              onClick={() => {
                setError(null);
                setClearMode('selected');
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete selected
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => {
                setError(null);
                setClearMode('all');
              }}
            >
              Clear all logs
            </Button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {canClear && (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all audit records on this page"
                        checked={allSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 font-medium">When</th>
                  <th scope="col" className="px-4 py-3 font-medium">Actor</th>
                  <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  <th scope="col" className="px-4 py-3 font-medium">Entity</th>
                  <th scope="col" className="px-4 py-3 font-medium">Record</th>
                  <th scope="col" className="px-4 py-3 font-medium">Changes</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => {
                  const changeCount = getAuditFieldChanges(
                    log.old_data,
                    log.new_data,
                    log.action
                  ).length;

                  return (
                    <tr key={log.id} className="transition-colors hover:bg-muted/30">
                      {canClear && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select audit record ${shortAuditId(log.id)}`}
                            checked={selectedIds.includes(log.id)}
                            onChange={(event) => toggleOne(log.id, event.target.checked)}
                            className="h-4 w-4 rounded border-input accent-primary"
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <time dateTime={log.created_at}>{formatAuditDate(log.created_at)}</time>
                      </td>
                      <td className="max-w-56 truncate px-4 py-3">
                        {log.actor_email ?? 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <AuditActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3 capitalize">{log.table_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {shortAuditId(log.record_id)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {changeCount} field{changeCount === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={detailHref(log.id)} className="font-medium text-primary hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {logs.map((log) => {
              const changeCount = getAuditFieldChanges(
                log.old_data,
                log.new_data,
                log.action
              ).length;

              return (
                <li key={log.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {canClear && (
                        <input
                          type="checkbox"
                          aria-label={`Select audit record ${shortAuditId(log.id)}`}
                          checked={selectedIds.includes(log.id)}
                          onChange={(event) => toggleOne(log.id, event.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                        />
                      )}
                      <AuditActionBadge action={log.action} />
                    </div>
                    <time dateTime={log.created_at} className="shrink-0 text-xs text-muted-foreground">
                      {formatAuditDate(log.created_at)}
                    </time>
                  </div>
                  <p className="mt-3 text-sm font-medium capitalize">{log.table_name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {log.actor_email ?? 'System'} ·{' '}
                    <span className="font-mono">{shortAuditId(log.record_id)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {changeCount} field{changeCount === 1 ? '' : 's'} changed
                  </p>
                  <Link href={detailHref(log.id)} className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                    View changes
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={clearMode !== null}
        onOpenChange={(open) => {
          if (!open && !loading) setClearMode(null);
        }}
        title={clearMode === 'all' ? 'Clear all audit logs?' : 'Delete selected records?'}
        description={
          clearMode === 'all'
            ? 'This permanently deletes every audit record, including records outside the current filters. This action is not recorded.'
            : `This permanently deletes ${selectedIds.length} selected records. This action is not recorded.`
        }
        confirmLabel={clearMode === 'all' ? 'Clear all logs' : 'Delete selected'}
        onConfirm={clearLogs}
        loading={loading}
        error={error}
        destructive
      />
    </>
  );
}
