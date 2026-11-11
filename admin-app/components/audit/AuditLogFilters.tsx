'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AUDIT_ACTIONS,
  AUDIT_TABLES,
  buildAuditLogsHref,
  capitalize,
} from '@/lib/audit';
import { Select } from '@/components/ui/Select';

const FILTER_DEBOUNCE_MS = 300;

interface AuditLogFiltersProps {
  action?: string;
  table?: string;
}

export function AuditLogFilters({ action, table }: AuditLogFiltersProps) {
  const router = useRouter();
  const [actionValue, setActionValue] = useState(action ?? '');
  const [tableValue, setTableValue] = useState(table ?? '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFilters = Boolean(actionValue || tableValue);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    []
  );

  useEffect(() => {
    if (debounceTimer.current) return;
    setActionValue(action ?? '');
    setTableValue(table ?? '');
  }, [action, table]);

  const scheduleFilterUpdate = (nextAction: string, nextTable: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.replace(
        buildAuditLogsHref({
          action: nextAction || undefined,
          table: nextTable || undefined,
        }),
        { scroll: false }
      );
      debounceTimer.current = null;
    }, FILTER_DEBOUNCE_MS);
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
          onChange={(event) => {
            const nextAction = event.target.value;
            setActionValue(nextAction);
            scheduleFilterUpdate(nextAction, tableValue);
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
          onChange={(event) => {
            const nextTable = event.target.value;
            setTableValue(nextTable);
            scheduleFilterUpdate(actionValue, nextTable);
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
          <Link
            href="/admin/audit-logs"
            onClick={() => {
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
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
