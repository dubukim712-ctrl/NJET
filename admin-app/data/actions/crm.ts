'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/data/auth/guards';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { PERMISSIONS } from '@/lib/permissions';

type FormState = { message: string; error: boolean } | null;
const customerBranch = z.object({ customerId: z.uuid(), branchId: z.uuid() });

async function requireCrmManager() {
  await requirePermission(PERMISSIONS.adminAccess, '/admin/crm');
  await requirePermission(PERMISSIONS.crmRead, '/admin/crm');
  return requirePermission(PERMISSIONS.crmManage, '/admin/crm');
}

function refreshCrm(customerId?: string) {
  revalidatePath('/admin/crm/follow-ups');
  if (customerId) revalidatePath('/admin/crm/' + customerId);
}

export async function addCrmNote(customerId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireCrmManager();
  const parsed = customerBranch.extend({ body: z.string().trim().min(1).max(2000) })
    .safeParse({ ...Object.fromEntries(form), customerId });
  if (!parsed.success) return { error: true, message: 'Choose a branch and enter a note up to 2,000 characters.' };

  const { branchId, body } = parsed.data;
  const result = await supabase.from('crm_customer_notes').insert({ customer_id: customerId, branch_id: branchId, body });
  if (result.error) return { error: true, message: toUserFriendlyError(result.error, 'Could not save the note.') };
  refreshCrm(customerId);
  return { error: false, message: 'Note saved.' };
}

export async function addCrmFollowUp(customerId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireCrmManager();
  const [branchId, assigneeId] = String(form.get('assignment') ?? '').split(':');
  const parsed = customerBranch.extend({
    assigneeId: z.uuid(),
    dueOn: z.iso.date(),
    nextAction: z.string().trim().min(1).max(300),
  }).safeParse({ ...Object.fromEntries(form), customerId, branchId, assigneeId });
  if (!parsed.success) return { error: true, message: 'Choose a staff member and due date, and describe the next action.' };

  const row = parsed.data;
  const result = await supabase.from('crm_follow_ups').insert({
    customer_id: row.customerId,
    branch_id: row.branchId,
    assignee_id: row.assigneeId,
    due_on: row.dueOn,
    next_action: row.nextAction,
  });
  if (result.error) return { error: true, message: toUserFriendlyError(result.error, 'Could not create the follow-up.') };
  refreshCrm(row.customerId);
  return { error: false, message: 'Follow-up created.' };
}

export async function setCrmFollowUpStatus(followUpId: string, nextStatus: string, _: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await requireCrmManager();
  const parsed = z.object({ id: z.uuid(), status: z.enum(['open', 'completed']) })
    .safeParse({ id: followUpId, status: nextStatus });
  if (!parsed.success) return { error: true, message: 'Choose a valid follow-up.' };

  const { id, status } = parsed.data;
  const result = await supabase.from('crm_follow_ups').update({ status }).eq('id', id)
    .select('customer_id').maybeSingle();
  if (result.error || !result.data) return { error: true, message: 'Could not update this follow-up.' };
  refreshCrm(result.data.customer_id);
  return { error: false, message: status === 'completed' ? 'Follow-up completed.' : 'Follow-up reopened.' };
}
