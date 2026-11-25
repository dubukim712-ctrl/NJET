'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { queueAppointmentStatusEmail } from '@/data/email/appointment-status-email';
import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer, requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  serviceAppointmentIdSchema,
  serviceAppointmentCancellationRequestSchema,
  serviceAppointmentCancellationReviewSchema,
} from '@/lib/validations/service-appointments';

export async function requestServiceAppointmentCancellationAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requireCustomer('/dashboard/appointments');
  const parsed = serviceAppointmentCancellationRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please enter a subject and reason for cancellation.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const { appointmentId, subject, reason } = parsed.data;
  const { error } = await supabase.rpc(
    'request_service_appointment_cancellation',
    {
      p_appointment_id: appointmentId,
      p_subject: subject,
      p_reason: reason,
    }
  );
  if (error) {
    console.error('Could not submit service appointment cancellation request.', error);
    return { success: false, error: toUserFriendlyError(error, 'Could not submit the cancellation request.') };
  }
  return { success: true, data: undefined };
}

export async function reviewServiceAppointmentCancellationAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentCancellationReviewSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Choose a valid cancellation decision.' };
  }
  const { error } = await supabase.rpc(
    'review_service_appointment_cancellation',
    {
      p_request_id: parsed.data.requestId,
      p_decision: parsed.data.decision,
    }
  );
  if (error) {
    console.error('Could not review service appointment cancellation request.', error);
    return { success: false, error: toUserFriendlyError(error, 'Could not review the cancellation request.') };
  }
  queueAppointmentStatusEmail({ id: parsed.data.requestId, event: parsed.data.decision === 'approve' ? 'approved' : 'rejected' });
  return { success: true, data: undefined };
}

export async function cancelStaffServiceAppointmentAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.serviceAppointmentsManage, '/admin/appointments');
  const parsed = serviceAppointmentIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Choose a valid appointment.' };

  const { data, error } = await supabase.from('service_appointments')
    .update({ status: 'cancelled' })
    .eq('id', parsed.data)
    .in('status', ['requested', 'confirmed'])
    .select('id')
    .maybeSingle();
  if (error) return { success: false, error: toUserFriendlyError(error, 'Could not cancel the appointment.') };
  if (!data) return { success: false, error: 'The appointment is no longer eligible for cancellation.' };
  return { success: true, data: undefined };
}
