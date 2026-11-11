import type { Json } from '@/types/database';

export const AUDIT_ACTIONS = ['insert', 'update', 'delete', 'clear'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TABLES = [
  'users',
  'roles',
  'role_permissions',
  'branches',
  'delivery_zones',
  'product_categories',
  'product_subcategories',
  'products',
  'product_variants',
  'inventory_movements',
  'orders',
  'order_items',
  'order_invoices',
  'order_certificates',
  'payment_recipients',
  'ownership_certificate_templates',
  'business_settings',
  'audit_logs',
] as const;
export type AuditTable = (typeof AUDIT_TABLES)[number];

export type AuditQueryError = 'missing_table' | 'unknown' | null;

export interface AuditFieldChange {
  key: string;
  label: string;
  oldValue: Json | undefined;
  newValue: Json | undefined;
}

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  role_id: 'Role ID',
  full_name: 'Full name',
  avatar_url: 'Avatar URL',
  created_at: 'Created at',
  updated_at: 'Updated at',
  is_system: 'System role',
  scope: 'Role scope',
  is_full_access: 'Full access',
  permission_key: 'Permission',
  group_name: 'Permission group',
  surface: 'Permission surface',
  sort_order: 'Sort order',
  deleted_count: 'Entries cleared',
  clear_scope: 'Clear scope',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function parseAuditAction(value?: string): AuditAction | undefined {
  return AUDIT_ACTIONS.includes(value as AuditAction)
    ? (value as AuditAction)
    : undefined;
}

export function parseAuditTable(value?: string): AuditTable | undefined {
  return AUDIT_TABLES.includes(value as AuditTable)
    ? (value as AuditTable)
    : undefined;
}

export function buildAuditLogsHref({
  page = 1,
  action,
  table,
}: {
  page?: number;
  action?: string;
  table?: string;
}): string {
  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (table) params.set('table', table);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return `/admin/audit-logs${query ? `?${query}` : ''}`;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatAuditDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

export function humanizeField(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/_/g, ' ');
  return capitalize(words);
}

function toRecord(data: Json | null): Record<string, Json | undefined> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data as Record<string, Json | undefined>;
}

export function getAuditFieldChanges(
  oldData: Json | null,
  newData: Json | null,
  action: string
): AuditFieldChange[] {
  const before = toRecord(oldData);
  const after = toRecord(newData);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys]
    .filter((key) => key !== 'updated_at')
    .map((key) => ({ key, oldValue: before[key], newValue: after[key] }))
    .filter(({ oldValue, newValue }) => {
      if (action !== 'update') return true;
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    })
    .map(({ key, oldValue, newValue }) => ({
      key,
      label: humanizeField(key),
      oldValue,
      newValue,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function formatAuditValue(value: Json | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value === '' ? '—' : value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value, null, 2);
}

export function shortAuditId(value: string | null): string {
  if (!value) return '—';
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function isValidAuditId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
