'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { WarrantyExchange } from '@/types/service-warranty';

const schema = z.discriminatedUnion('operation', [
  z.object({ appointmentId: z.uuid(), operation: z.literal('receive'), originalSerial: z.string().trim().min(1).max(100), value: z.string().trim().min(1).max(1500) }),
  z.object({ appointmentId: z.uuid(), operation: z.literal('reserve'), value: z.string().trim().min(1).max(100) }),
  z.object({ appointmentId: z.uuid(), operation: z.literal('release'), expectedReplacementUnitId: z.uuid() }),
  z.object({ appointmentId: z.uuid(), operation: z.literal('handover'), expectedReplacementUnitId: z.uuid(), handoverOn: z.iso.date() }),
]);

export async function getStaffWarrantyExchangeAction(appointmentId: string): Promise<ActionResult<{
  exchange: WarrantyExchange | null; options: { serial: string; motor: string }[]; canProcess: boolean;
}>> {
  const { supabase, profile } = await requirePermission(PERMISSIONS.serviceAppointmentsManage, '/admin/appointments');
  if (!z.uuid().safeParse(appointmentId).success) return { success: false, error: 'Choose a valid appointment.' };
  const canProcess = hasPermission(profile, PERMISSIONS.productsManage);
  const [record, options] = await Promise.all([
    supabase.rpc('service_warranty_exchange_details', { p_appointment_id: appointmentId }).maybeSingle(),
    canProcess ? supabase.rpc('service_warranty_replacement_options', { p_appointment_id: appointmentId }) : null,
  ]);
  const error = record.error ?? options?.error;
  if (error) return { success: false, error: toUserFriendlyError(error, 'Could not load the warranty exchange.') };
  return { success: true, data: { exchange: record.data, options: options?.data ?? [], canProcess } };
}

export async function manageWarrantyExchangeAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.serviceAppointmentsManage, '/admin/appointments');
  await requirePermission(PERMISSIONS.productsManage, '/admin/appointments');
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Complete the required exchange fields.' };
  const input = parsed.data;
  const { error } = await supabase.rpc('manage_service_warranty_exchange', {
    p_appointment_id: input.appointmentId,
    p_operation: input.operation,
    p_value: 'value' in input ? input.value : null,
    p_handover_on: 'handoverOn' in input ? input.handoverOn : null,
    p_expected_replacement_unit_id: 'expectedReplacementUnitId' in input ? input.expectedReplacementUnitId : null,
    p_original_serial: 'originalSerial' in input ? input.originalSerial : null,
  });
  if (error) return { success: false, error: toUserFriendlyError(error, 'Could not save the exchange. Check the current step, serial and branch stock.') };
  revalidatePath('/dashboard/appointments/' + input.appointmentId);
  return { success: true, data: undefined };
}
