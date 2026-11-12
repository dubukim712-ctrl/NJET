'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer, requireFullAccess, requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  branchServiceHoursSchema,
  customerServiceAvailabilitySchema,
  serviceAppointmentSlotsSchema,
} from '@/lib/validations/service-availability';

export type CustomerServiceAppointmentSlots = {
  hoursConfigured: boolean;
  branchOpen: boolean;
  times: string[];
  closures: { startsAt: string; endsAt: string }[];
};

export type StaffServiceAppointmentSlots = Omit<
  CustomerServiceAppointmentSlots,
  'closures'
>;

export type CustomerServiceAvailability = {
  branchName: string;
  hoursConfigured: boolean;
  branchOpen: boolean;
  closureActive: boolean;
  technicians: { id: string; name: string; available: boolean }[];
};

export async function getCustomerServiceAppointmentSlotsAction(
  payload: unknown
): Promise<ActionResult<CustomerServiceAppointmentSlots>> {
  const { supabase } = await requireCustomer('/dashboard/appointments/new');
  const parsed = serviceAppointmentSlotsSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Choose a valid branch and service date.' };
  }

  try {
    const [slotsResult, closuresResult] = await Promise.all([
      supabase.rpc('customer_service_appointment_slots', {
        p_branch_id: parsed.data.branchId,
        p_date: parsed.data.date,
      }),
      supabase.rpc('customer_service_appointment_closures', {
        p_branch_id: parsed.data.branchId,
        p_date: parsed.data.date,
      }),
    ]);
    if (slotsResult.error) throw slotsResult.error;
    if (closuresResult.error) throw closuresResult.error;
    const rows = slotsResult.data ?? [];
    if (!rows.length) {
      return { success: false, error: 'Service times are unavailable for this branch.' };
    }

    return {
      success: true,
      data: {
        hoursConfigured: rows[0].hours_configured,
        branchOpen: rows[0].branch_open,
        times: rows.flatMap((row) => row.slot_time ? [row.slot_time] : []),
        closures: (closuresResult.data ?? []).map((closure) => ({
          startsAt: closure.starts_at,
          endsAt: closure.ends_at,
        })),
      },
    };
  } catch (error) {
    console.error('Could not load customer service times.', error);
    return { success: false, error: 'Service times could not be loaded.' };
  }
}

export async function getStaffServiceAppointmentSlotsAction(
  payload: unknown
): Promise<ActionResult<StaffServiceAppointmentSlots>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentSlotsSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Choose a valid branch and service date.' };
  }

  try {
    const { data, error } = await supabase.rpc('customer_service_appointment_slots', {
      p_branch_id: parsed.data.branchId,
      p_date: parsed.data.date,
    });
    if (error) throw error;
    const rows = data ?? [];
    if (!rows.length) {
      return { success: false, error: 'Service times are unavailable for this branch.' };
    }

    return {
      success: true,
      data: {
        hoursConfigured: rows[0].hours_configured,
        branchOpen: rows[0].branch_open,
        times: rows.flatMap((row) => row.slot_time ? [row.slot_time] : []),
      },
    };
  } catch (error) {
    console.error('Could not load staff service times.', error);
    return { success: false, error: 'Service times could not be loaded.' };
  }
}

export async function getCustomerServiceAppointmentAvailabilityAction(
  payload: unknown
): Promise<ActionResult<CustomerServiceAvailability>> {
  const { supabase } = await requireCustomer('/dashboard/appointments/new');
  const parsed = customerServiceAvailabilitySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Choose a valid branch and 30-minute time slot.' };
  }

  try {
    const { data, error } = await supabase.rpc(
      'customer_service_appointment_availability',
      {
        p_branch_id: parsed.data.branchId,
        p_slot_start: parsed.data.slotStart,
      }
    );
    if (error) throw error;

    const rows = data ?? [];
    const result = rows[0];
    if (!result) {
      return { success: false, error: 'Service availability is unavailable for this branch.' };
    }

    return {
      success: true,
      data: {
        branchName: result.branch_name,
        hoursConfigured: result.hours_configured,
        branchOpen: result.branch_open,
        closureActive: result.closure_active,
        technicians: rows.flatMap((technician) =>
          technician.technician_id && technician.technician_name
            ? [{
                id: technician.technician_id,
                name: technician.technician_name,
                available: technician.technician_available,
              }]
            : []
        ),
      },
    };
  } catch (error) {
    console.error('Could not load customer service availability.', error);
    return { success: false, error: 'Technician availability could not be loaded.' };
  }
}

export async function saveBranchServiceHoursAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = branchServiceHoursSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the branch service hours and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await supabase.rpc('save_branch_service_hours', {
      p_branch_id: parsed.data.branchId,
      p_hours: parsed.data.hours.map((day) => ({
        day_of_week: day.dayOfWeek,
        is_open: day.isOpen,
        opens_at: day.isOpen ? day.opensAt : null,
        closes_at: day.isOpen ? day.closesAt : null,
      })),
    });
    if (error) throw error;
  } catch (error) {
    console.error('Could not save branch service hours.', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Branch service hours could not be saved.',
    };
  }

  revalidatePath('/admin/settings');
  revalidatePath('/dashboard/appointments/new');
  return { success: true, data: undefined };
}
