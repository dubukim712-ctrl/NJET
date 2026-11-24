import type { ActionResult } from '@/data/actions/auth';
import { getAuthContext } from '@/data/auth/guards';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { serviceAppointmentNoteSchema } from '@/lib/validations/service-appointments';

export async function updateServiceAppointmentNote(
  payload: unknown
): Promise<ActionResult> {
  const context = await getAuthContext();
  if (!context?.profile) {
    return { success: false, error: 'You must be signed in.' };
  }
  if (
    !hasPermission(context.profile, PERMISSIONS.serviceAppointmentsManage) &&
    !hasPermission(context.profile, PERMISSIONS.serviceAppointmentsWork)
  ) {
    return { success: false, error: 'You do not have permission to update appointment notes.' };
  }
  const parsed = serviceAppointmentNoteSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'The appointment note is invalid.' };
  const { error } = await context.supabase
    .from('service_appointment_internal_notes')
    .upsert({
      appointment_id: parsed.data.appointmentId,
      note: parsed.data.note,
      updated_by: context.profile.id,
    }, { onConflict: 'appointment_id' });
  if (error) {
    console.error('Could not update appointment note.', error);
    return { success: false, error: toUserFriendlyError(error, 'Appointment notes could not be saved.') };
  }
  return { success: true, data: undefined };
}
