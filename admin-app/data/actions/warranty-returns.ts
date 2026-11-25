'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { PERMISSIONS } from '@/lib/permissions';
import { returnDispositions, returnReasons } from '@/lib/warranty-returns';
import type { WarrantyReturn } from '@/types/service-warranty';

const cursorSchema = z.object({ receivedAt: z.iso.datetime({ offset: true }), appointmentId: z.uuid() });
type Cursor = z.infer<typeof cursorSchema>;
const updateSchema = z.object({
  appointmentId: z.uuid(),
  reason: z.enum(Object.keys(returnReasons) as (keyof typeof returnReasons)[]),
  disposition: z.enum(Object.keys(returnDispositions) as (keyof typeof returnDispositions)[]),
  note: z.string().trim().max(1000),
  previousId: z.string().regex(/^\d+$/).nullable(),
});

export async function listWarrantyReturnsAction(cursor: Cursor | null): Promise<ActionResult<{
  rows: WarrantyReturn[]; next: Cursor | null;
}>> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = cursorSchema.nullable().safeParse(cursor);
  if (!parsed.success) return { success: false, error: 'Reload the list and try again.' };
  const { data, error } = await supabase.rpc('list_warranty_returns', {
    p_before_at: parsed.data?.receivedAt ?? null,
    p_before_id: parsed.data?.appointmentId ?? null,
  });
  if (error) return { success: false, error: toUserFriendlyError(error, 'Could not load warranty returns.') };
  const rows = data.slice(0, 25);
  const last = rows.at(-1);
  return {
    success: true,
    data: { rows, next: data.length > rows.length && last
      ? { receivedAt: last.received_at, appointmentId: last.appointment_id }
      : null },
  };
}

export async function recordWarrantyReturnAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Choose a reason and disposition. Keep notes to 1,000 characters.' };
  const { appointmentId, reason, disposition, note, previousId } = parsed.data;
  const { data, error } = await supabase.rpc('record_warranty_return_update', {
    p_appointment_id: appointmentId, p_reason: reason, p_disposition: disposition, p_note: note, p_previous_id: previousId,
  });
  if (error) return { success: false, error: toUserFriendlyError(error, 'Could not save the return update.') };
  if (!data) return { success: false, error: 'Someone updated this return. Refresh the list before saving again.' };
  return { success: true, data: undefined };
}
