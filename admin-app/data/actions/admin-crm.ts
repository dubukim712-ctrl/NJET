'use server';

import { z } from 'zod';
import { requirePermission, requireStaff } from '@/data/auth/guards';
import { getCrmCustomers, getCrmFollowUpPage, getCrmProfile } from '@/data/crm/queries';
import { CRM_PAGE_SIZE } from '@/lib/crm-view';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const pageSchema = z.number().int().min(1).max(100_000);
const searchSchema = z.string().trim().max(100);

async function crmReader(expectedUserId: string) {
  await requireStaff('/admin/crm');
  const context = await requirePermission(PERMISSIONS.crmRead, '/admin/crm');
  if (context.user.id !== expectedUserId) throw new Error('Your admin session has changed.');
  return context;
}

export async function getAdminCrmCustomers(userId: string, search: string, page: number) {
  const { supabase } = await crmReader(userId);
  const result = await getCrmCustomers(supabase, searchSchema.parse(search), (pageSchema.parse(page) - 1) * CRM_PAGE_SIZE);
  if (result.error) throw new Error('Customers could not be loaded.');
  return result.data ?? [];
}

export async function getAdminCrmFollowUps(userId: string, input: unknown) {
  const { supabase } = await crmReader(userId);
  const filters = z.object({
    status: z.enum(['open', 'completed']),
    mine: z.boolean(),
    due: z.enum(['any', 'overdue', 'today', 'upcoming']),
    search: searchSchema,
    page: pageSchema,
  }).parse(input);
  const result = await getCrmFollowUpPage(supabase, { ...filters, offset: (filters.page - 1) * CRM_PAGE_SIZE });
  if (result.error) throw new Error('Follow-ups could not be loaded.');
  return result.data ?? [];
}

export async function getAdminCrmCustomer(userId: string, customerId: string) {
  const { supabase, profile } = await crmReader(userId);
  const result = await getCrmProfile(supabase, z.uuid().parse(customerId), hasPermission(profile, PERMISSIONS.crmManage));
  if (!result.customer && result.error) throw new Error('Customer profile could not be loaded.');
  return { ...result, error: Boolean(result.error) };
}
