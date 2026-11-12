'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer, requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
  return { success: true, data: undefined };
}
