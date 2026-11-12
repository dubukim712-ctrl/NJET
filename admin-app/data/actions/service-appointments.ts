'use server';

import type { ActionResult } from '@/data/actions/auth';
import { getAuthContext, requireCustomer, requirePermission } from '@/data/auth/guards';
import {
  getCustomerServiceAppointments,
  getStaffServiceAppointments,
} from '@/data/appointments/queries';
import {
  assignedServiceAppointmentStatusSchema,
  customerServiceAppointmentRequestSchema,
  serviceAppointmentFiltersSchema,
  serviceAppointmentIdSchema,
  serviceAppointmentNoteSchema,
  staffServiceAppointmentCreateSchema,
  staffServiceAppointmentUpdateSchema,
} from '@/lib/validations/service-appointments';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function getCustomerServiceAppointmentBranchesAction(): Promise<
  ActionResult<{ branches: { id: string; name: string }[] }>
> {
  const { supabase } = await requireCustomer('/dashboard/appointments/new');
  const { data, error } = await supabase.rpc('storefront_branch_options');
  if (error) {
    console.error('Could not load service appointment branches.', error);
    return { success: false, error: 'Service locations could not be loaded.' };
  }
  return { success: true, data: { branches: data } };
}

export async function getCustomerServiceAppointmentsAction(): Promise<
  ActionResult<NonNullable<Awaited<ReturnType<typeof getCustomerServiceAppointments>>['data']>>
> {
  const { supabase } = await requireCustomer('/dashboard/appointments');
  const result = await getCustomerServiceAppointments(supabase);
  if (!result.data) return { success: false, error: result.error ?? 'Appointments are unavailable.' };
  return { success: true, data: result.data };
}

export async function requestServiceAppointmentAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireCustomer('/dashboard/appointments/new');
  const parsed = customerServiceAppointmentRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please correct the appointment details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const appointment = parsed.data;
  const { data, error } = await supabase.rpc('request_service_appointment', {
    p_branch_id: appointment.branchId,
    p_service_mode: appointment.serviceMode,
    p_service_type: appointment.serviceType,
    p_bike_make: appointment.bikeMake,
    p_bike_model: appointment.bikeModel,
    p_bike_serial_number: appointment.bikeSerialNumber || null,
    p_issue_description: appointment.issueDescription,
    p_address_line1: appointment.addressLine1 || null,
    p_barangay: appointment.barangay || null,
    p_city: appointment.city || null,
    p_province: appointment.province || null,
    p_postal_code: appointment.postalCode || null,
    p_contact_number: appointment.contactNumber,
    p_preferred_start_at: appointment.preferredStartAt,
  });
  if (error) {
    console.error('Could not create service appointment request.', error);
    return { success: false, error: error.message };
  }
  return { success: true, data: { id: data } };
}

export async function getStaffServiceAppointmentsAction(
  payload: unknown
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getStaffServiceAppointments>>['data']>>> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsRead,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentFiltersSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Appointment filters are invalid.' };
  const result = await getStaffServiceAppointments(
    supabase,
    parsed.data,
    hasPermission(profile, PERMISSIONS.serviceAppointmentsManage)
  );
  if (!result.data) {
    return { success: false, error: result.error ?? 'Appointment data is unavailable.' };
  }
  return { success: true, data: result.data };
}

export async function getStaffServiceAppointmentOptionsAction(): Promise<
  ActionResult<{
    branches: { id: string; name: string }[];
    canManage: boolean;
    canWork: boolean;
    userId: string;
  }>
> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsRead,
    '/admin/appointments'
  );
  const { data, error } = await supabase.rpc('service_appointment_branch_options');
  if (error) {
    console.error('Could not load appointment branch options.', error);
    return { success: false, error: 'Appointment filters could not be loaded.' };
  }
  return {
    success: true,
    data: {
      branches: data,
      canManage: hasPermission(profile, PERMISSIONS.serviceAppointmentsManage),
      canWork: hasPermission(profile, PERMISSIONS.serviceAppointmentsWork),
      userId: profile.id,
    },
  };
}

export async function getTechnicianOptionsAction(
  branchId: unknown
): Promise<ActionResult<{ technicians: { id: string; name: string }[] }>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentIdSchema.safeParse(branchId);
  if (!parsed.success) return { success: false, error: 'Choose a valid branch.' };
  const { data, error } = await supabase.rpc('service_appointment_technician_options', {
    p_branch_id: parsed.data,
  });
  if (error) {
    console.error('Could not load appointment technicians.', error);
    return { success: false, error: 'Technician options could not be loaded.' };
  }
  return { success: true, data: { technicians: data } };
}

export async function createStaffServiceAppointmentAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = staffServiceAppointmentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please correct the appointment details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const appointment = parsed.data;
  const { data: branches, error: branchError } = await supabase.rpc(
    'service_appointment_branch_options'
  );
  if (branchError) {
    console.error('Could not verify appointment branch.', branchError);
    return { success: false, error: 'Branch access could not be verified.' };
  }
  const branch = branches.find((entry) => entry.id === appointment.branchId);
  if (!branch) return { success: false, error: 'Choose a branch you can access.' };

  const { data, error } = await supabase
    .from('service_appointments')
    .insert({
      customer_id: null,
      customer_name: appointment.customerName,
      contact_number: appointment.contactNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      service_mode: appointment.serviceMode,
      service_type: appointment.serviceType,
      bike_make: appointment.bikeMake,
      bike_model: appointment.bikeModel,
      bike_serial_number: appointment.bikeSerialNumber || null,
      issue_description: appointment.issueDescription,
      address_line1: appointment.addressLine1 || null,
      barangay: appointment.barangay || null,
      city: appointment.city || null,
      province: appointment.province || null,
      postal_code: appointment.postalCode || null,
      preferred_start_at: appointment.scheduledAt,
      scheduled_at: appointment.scheduledAt,
      status: 'confirmed',
      assigned_technician_id: appointment.assignedTechnicianId,
      estimate_minor: appointment.estimateMinor,
      created_by: profile.id,
    })
    .select('id')
    .single();
  if (error) {
    console.error('Could not create staff service appointment.', error);
    return { success: false, error: error.message };
  }
  return { success: true, data: { id: data.id } };
}

export async function updateStaffServiceAppointmentAction(
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
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Could not update service appointment.', error);
    return { success: false, error: error.message };
  }
  if (!data) return { success: false, error: 'Appointment was not found or is outside your branch access.' };
  return { success: true, data: undefined };
}

export async function updateAssignedServiceAppointmentStatusAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requirePermission(
    PERMISSIONS.serviceAppointmentsWork,
    '/admin/appointments'
  );
  const parsed = assignedServiceAppointmentStatusSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid appointment status.' };
  const { error } = await supabase.rpc('set_assigned_service_appointment_status', {
    p_appointment_id: parsed.data.appointmentId,
    p_status: parsed.data.status,
  });
  if (error) {
    console.error('Could not update assigned service appointment.', error);
    return { success: false, error: error.message };
  }
  return { success: true, data: undefined };
}

export async function updateServiceAppointmentNoteAction(
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
    return { success: false, error: 'Appointment notes could not be saved.' };
  }
  return { success: true, data: undefined };
}
