'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  serviceAppointmentClosureCreateSchema,
  serviceAppointmentClosureIdSchema,
  serviceAppointmentClosuresFilterSchema,
} from '@/lib/validations/service-availability';
import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Closure = Pick<
  Database['public']['Tables']['service_appointment_closures']['Row'],
  'id' | 'branch_id' | 'starts_at' | 'ends_at' | 'reason'
>;

async function getAccessibleBranchIds(
  supabase: SupabaseClient
) {
  try {
    const { data, error } = await supabase.rpc('service_appointment_branch_options');
    if (error) throw error;
    return { ids: data.map((branch) => branch.id), error: null };
  } catch (error) {
    console.error('Could not verify appointment closure branch access.', error);
    return { ids: null, error: 'Branch access could not be verified.' };
  }
}

export async function getServiceAppointmentClosuresAction(
  payload: unknown
): Promise<ActionResult<Closure[]>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentClosuresFilterSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid branch filter.' };

  const accessible = await getAccessibleBranchIds(supabase);
  if (!accessible.ids) return { success: false, error: accessible.error };
  if (parsed.data.branchId && !accessible.ids.includes(parsed.data.branchId)) {
    return { success: false, error: 'You cannot manage closures for that branch.' };
  }
  if (!accessible.ids.length) return { success: true, data: [] };

  let query = supabase
    .from('service_appointment_closures')
    .select('id, branch_id, starts_at, ends_at, reason')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')
    .limit(100);
  query = parsed.data.branchId
    ? query.eq('branch_id', parsed.data.branchId)
    : query.in('branch_id', accessible.ids);

  try {
    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Could not load service appointment closures.', error);
    return { success: false, error: 'Branch closures could not be loaded.' };
  }
}

export async function createServiceAppointmentClosureAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentClosureCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the closure details and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const accessible = await getAccessibleBranchIds(supabase);
  if (!accessible.ids) return { success: false, error: accessible.error };
  if (!accessible.ids.includes(parsed.data.branchId)) {
    return { success: false, error: 'You cannot manage closures for that branch.' };
  }

  try {
    const { data, error } = await supabase
      .from('service_appointment_closures')
      .insert({
        branch_id: parsed.data.branchId,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        reason: parsed.data.reason,
        created_by: profile.id,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error('Could not create service appointment closure.', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Branch closure could not be created.',
    };
  }
}

export async function deleteServiceAppointmentClosureAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requirePermission(
    PERMISSIONS.serviceAppointmentsManage,
    '/admin/appointments'
  );
  const parsed = serviceAppointmentClosureIdSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid closure.' };

  try {
    const { data, error } = await supabase
      .from('service_appointment_closures')
      .delete()
      .eq('id', parsed.data)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        success: false,
        error: 'Closure was not found or is outside your branch access.',
      };
    }
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not remove service appointment closure.', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Branch closure could not be removed.',
    };
  }
}
