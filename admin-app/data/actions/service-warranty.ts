'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { PERMISSIONS } from '@/lib/permissions';
import type { WarrantyDetails, WarrantyUnit } from '@/types/service-warranty';

const serial = z.string().trim().min(1).max(100);
const failure = (error: unknown, message: string) => ({
  success: false as const, error: toUserFriendlyError(error, message),
});

export async function getOrderWarrantyUnitsAction(orderId: string): Promise<ActionResult<WarrantyUnit[]>> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders');
  if (!z.uuid().safeParse(orderId).success) return { success: false, error: 'Choose a valid order.' };
  const { data, error } = await supabase.rpc('order_warranty_units', { p_order_id: orderId });
  return error ? failure(error, 'Could not load bikes from this order.') : { success: true, data };
}

export async function recordWarrantyHandoverAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders');
  const parsed = z.object({
    orderId: z.uuid(), unitId: z.uuid(), handoverOn: z.iso.date(),
    wheelCount: z.enum(['2', '3', '4']),
  }).strict().safeParse(input);
  if (!parsed.success) return { success: false, error: 'Enter a handover date and choose the wheel count.' };
  const { orderId, unitId, handoverOn, wheelCount } = parsed.data;
  const { error } = await supabase.rpc('record_ebike_warranty_handover', {
    p_order_id: orderId, p_unit_id: unitId, p_handover_on: handoverOn, p_wheel_count: Number(wheelCount),
  });
  if (error) return failure(error, 'Could not record the handover. Check the date and whether it was already recorded.');
  revalidatePath('/dashboard/appointments/new');
  return { success: true, data: undefined };
}

export async function getStaffWarrantyDetailsAction(appointmentId: string): Promise<ActionResult<WarrantyDetails | null>> {
  const { supabase } = await requirePermission(PERMISSIONS.serviceAppointmentsManage, '/admin/appointments');
  if (!z.uuid().safeParse(appointmentId).success) return { success: false, error: 'Choose a valid appointment.' };
  const { data, error } = await supabase.rpc('service_warranty_details', { p_appointment_id: appointmentId }).maybeSingle();
  return error ? failure(error, 'Could not load the warranty assessment.') : { success: true, data };
}

const review = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('link'), appointmentId: z.uuid(), serial }),
  z.object({
    kind: z.literal('review'), appointmentId: z.uuid(),
    decision: z.enum(['covered_repair', 'replacement_approved', 'paid_repair', 'further_review']),
    note: z.string().trim().min(1).max(1500),
  }),
  z.object({
    kind: z.literal('handover'), appointmentId: z.uuid(), serial, handoverOn: z.iso.date(),
  }),
]);

export async function saveStaffWarrantyAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.serviceAppointmentsManage, '/admin/appointments');
  const parsed = review.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Complete the required warranty fields and try again.' };
  const value = parsed.data;
  const p_appointment_id = value.appointmentId;
  const result = value.kind === 'link'
    ? await supabase.rpc('link_service_warranty_unit', { p_appointment_id, p_serial: value.serial })
    : value.kind === 'review'
      ? await supabase.rpc('review_service_warranty', { p_appointment_id, p_decision: value.decision, p_note: value.note })
      : await supabase.rpc('record_service_warranty_replacement', {
        p_appointment_id, p_serial: value.serial, p_handover_on: value.handoverOn,
      });
  if (result.error) {
    const message = {
      link: 'Could not verify the serial against this customer\u0027s completed purchases.',
      review: 'Could not save the decision. Check the appointment status and verified bike.',
      handover: 'Could not record the replacement. Check the approval, date, and replacement serial.',
    }[value.kind];
    return failure(result.error, message);
  }
  revalidatePath('/dashboard/appointments/' + value.appointmentId);
  return { success: true, data: undefined };
}

export async function startStaffWarrantyReviewAction(appointmentId: string): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.serviceAppointmentsManage, '/admin/appointments');
  if (!z.uuid().safeParse(appointmentId).success) return { success: false, error: 'Choose a valid appointment.' };
  const { error } = await supabase.rpc('start_service_warranty_review', { p_appointment_id: appointmentId });
  if (error) return failure(error, 'Could not start warranty review. Check the appointment status and branch access.');
  revalidatePath('/dashboard/appointments/' + appointmentId);
  return { success: true, data: undefined };
}
