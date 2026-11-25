import 'server-only';

import type { AuthContext } from '@/data/auth/guards';
import type { CrmDueFilter, CrmStatus } from '@/types/crm';

type Client = AuthContext['supabase'];

export function getCrmCustomers(client: Client, search: string, offset: number) {
  return client.rpc('crm_customers', { p_customer_id: null, p_search: search, p_offset: offset });
}

export async function getCrmProfile(client: Client, id: string, canManage: boolean) {
  const customer = await client.rpc('crm_customers', {
    p_customer_id: id, p_search: '', p_offset: 0,
  }).maybeSingle();
  if (customer.error || !customer.data) return { customer: customer.data, error: customer.error } as const;

  const [activity, notes, followUps, staff] = await Promise.all([
    client.rpc('crm_customer_activity', { p_customer_id: id }),
    client.rpc('crm_notes', { p_customer_id: id }),
    getCrmFollowUps(client, 'open', id),
    canManage ? client.rpc('crm_staff_options') : Promise.resolve({ data: [], error: null }),
  ]);
  return {
    customer: customer.data,
    activity: activity.data ?? [],
    notes: notes.data ?? [],
    followUps: followUps.data ?? [],
    staff: staff.data ?? [],
    error: activity.error ?? notes.error ?? followUps.error ?? staff.error,
  };
}

export function getCrmFollowUps(client: Client, status: CrmStatus, customerId: string | null = null) {
  return client.rpc('crm_follow_up_queue', { p_customer_id: customerId, p_status: status });
}

export function getCrmFollowUpPage(client: Client, filters: {
  status: CrmStatus;
  mine: boolean;
  due: CrmDueFilter;
  search: string;
  offset: number;
}) {
  return client.rpc('crm_follow_up_page', {
    p_status: filters.status, p_mine: filters.mine, p_due: filters.due,
    p_search: filters.search, p_offset: filters.offset,
  });
}
