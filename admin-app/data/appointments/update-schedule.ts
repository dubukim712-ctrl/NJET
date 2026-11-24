import 'server-only';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { queueAppointmentStatusEmail } from '@/data/email/appointment-status-email';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { PERMISSIONS } from '@/lib/permissions';
import { staffServiceAppointmentUpdateSchema } from '@/lib/validations/service-appointments';

export async function updateStaffServiceAppointment(
  payload: unknown
): Promise<ActionResult> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = staffServiceAppointmentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Please correct the appointment update.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const update = parsed.data;
  if (
    update.scheduledAt &&
    Date.parse(update.scheduledAt) <= Date.now() &&
    !['completed', 'cancelled', 'no_show'].includes(update.status)
  ) {
    return { success: false, error: 'Choose a future scheduled time.' };
  }
  const activeStatuses = ['confirmed', 'in_service', 'ready_for_pickup'];
  const prior = update.scheduledAt && activeStatuses.includes(update.status)
    ? (await supabase.from('service_appointments')
        .select('status, scheduled_at')
        .eq('id', update.id)
        .maybeSingle()).data
    : null;

  const { data, error } = await supabase
    .from('service_appointments')
    .update({
      status: update.status,
      scheduled_at: update.scheduledAt,
      assigned_technician_id: update.assignedTechnicianId,
      estimate_minor: update.estimateMinor,
      final_total_minor: update.finalTotalMinor,
      updated_by: profile.id,
    })
    .eq('id', update.id)
    .select('id, scheduled_at')
    .maybeSingle();
  if (error) {
    console.error('Could not update service appointment.', error);
    return { success: false, error: toUserFriendlyError(error, 'Could not update the service appointment.') };
  }
  if (!data) return { success: false, error: 'Appointment was not found or is outside your branch access.' };
  if (prior && data.scheduled_at) {
    if (!activeStatuses.includes(prior.status) || !prior.scheduled_at) {
      queueAppointmentStatusEmail({ id: data.id, event: 'confirmed', scheduledAt: data.scheduled_at });
    } else if (Date.parse(prior.scheduled_at) !== Date.parse(data.scheduled_at)) {
      queueAppointmentStatusEmail({ id: data.id, event: 'rescheduled', scheduledAt: data.scheduled_at });
    }
  }
  return { success: true, data: undefined };
}
