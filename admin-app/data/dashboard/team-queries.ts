import type { createClient } from '@/data/supabase/server';
import type { DashboardSection } from './types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadDashboardTeamMembers(
  supabase: SupabaseClient,
  branchId: string | null
): Promise<DashboardSection<number>> {
  try {
    const { data: staffRoles, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('scope', 'staff')
      .limit(100);
    if (roleError) throw roleError;
    if (!staffRoles.length) return { data: 0, error: null };
    let usersQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .in('role_id', staffRoles.map((role) => role.id));
    if (branchId) usersQuery = usersQuery.eq('branch_id', branchId);
    const { count, error } = await usersQuery;
    if (error) throw error;
    return { data: count ?? 0, error: null };
  } catch (error) {
    console.error('Could not load dashboard team members.', error);
    return { data: null, error: 'Team overview could not be loaded.' };
  }
}
