'use client';

import Link from 'next/link';
import {
  AUDIT_ACTIONS,
  AUDIT_TABLES,
  buildAuditLogsHref,
  capitalize,
} from '@/lib/audit';
import { Select } from '@/components/ui/Select';

interface AuditLogFiltersProps {
  action?: string;
  table?: string;
}

export function AuditLogFilters({ action, table }: AuditLogFiltersProps) {
  const actionValue = action ?? '';
  const tableValue = table ?? '';
  const hasFilters = Boolean(actionValue || tableValue);

  const applyFilters = (nextAction: string, nextTable: string) => {
    window.history.replaceState(null, '',
      buildAuditLogsHref({
        action: nextAction || undefined,
        table: nextTable || undefined,
      })
    );
  };

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
    >
      <div className="space-y-1">
        <Select
          id="action"
          name="action"
          label="Action"
          value={actionValue}
          onValueChange={(value) => {
            const nextAction = value;
            applyFilters(nextAction, tableValue);
          }}
          containerClassName="space-y-1"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((value) => (
            <option key={value} value={value}>
              {capitalize(value)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Select
          id="table"
          name="table"
          label="Entity"
          value={tableValue}
          onValueChange={(value) => {
            const nextTable = value;
            applyFilters(actionValue, nextTable);
          }}
          containerClassName="space-y-1"
        >
          <option value="">All entities</option>
          {AUDIT_TABLES.map((value) => (
            <option key={value} value={value}>
              {capitalize(value)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-end">
        {hasFilters ? (
          <Link prefetch={false}
            href="/admin/audit-logs"
            onNavigate={(event) => {
              event.preventDefault();
              window.history.replaceState(null, "", "/admin/audit-logs");
            }}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground lg:w-auto"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
