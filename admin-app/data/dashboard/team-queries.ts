import type { createClient } from '@/data/supabase/server';
import type { DashboardSection } from './types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadDashboardTeamMembers(
  supabase: SupabaseClient,
  branchId: string | null
): Promise<DashboardSection<number>> {
  try {
    let usersQuery = supabase
      .from('users')
      .select('id, roles!users_role_id_fkey!inner(scope)', { count: 'exact', head: true })
      .eq('roles.scope', 'staff');
    if (branchId) usersQuery = usersQuery.eq('branch_id', branchId);
    const { count, error } = await usersQuery;
    if (error) throw error;
    return { data: count ?? 0, error: null };
  } catch (error) {
    console.error('Could not load dashboard team members.', error);
    return { data: null, error: 'Team overview could not be loaded.' };
  }
}
