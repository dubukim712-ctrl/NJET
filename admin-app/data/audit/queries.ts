import { createClient } from '@/data/supabase/server';
import type { AuditLog } from '@/types/database';
import type {
  AuditAction,
  AuditQueryError,
  AuditTable,
} from '@/lib/audit';

export const AUDIT_PAGE_SIZE = 20;

export interface AuditLogQuery {
  action?: AuditAction;
  table?: AuditTable;
  page?: number;
  pageSize?: number;
}

export interface AuditLogResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  error: AuditQueryError;
}

export interface AuditLogDetailResult {
  log: AuditLog | null;
  error: AuditQueryError;
}

export async function getAuditLogs({
  action,
  table,
  page = 1,
  pageSize = AUDIT_PAGE_SIZE,
}: AuditLogQuery = {}): Promise<AuditLogResult> {
  const supabase = await createClient();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (action) {
    query = query.eq('action', action);
  }
  if (table) {
    query = query.eq('table_name', table);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Failed to load audit logs:', error.message);
    return {
      logs: [],
      total: 0,
      page: safePage,
      pageSize,
      error: error.code === 'PGRST205' ? 'missing_table' : 'unknown',
    };
  }

  return {
    logs: data ?? [],
    total: count ?? 0,
    page: safePage,
    pageSize,
    error: null,
  };
}

export async function getAuditLog(id: string): Promise<AuditLogDetailResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to load audit log:', error.message);
    return {
      log: null,
      error: error.code === 'PGRST205' ? 'missing_table' : 'unknown',
    };
  }

  return { log: data, error: null };
}
