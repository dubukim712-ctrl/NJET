import { createClient } from '@/data/supabase/server';

export type UserBranchOption = {
  id: string;
  name: string;
  active: boolean;
};

export async function getUserBranchOptions(): Promise<{
  branches: UserBranchOption[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc('user_branch_options');
    if (error) throw error;
    return { branches: data, error: null };
  } catch (error) {
    console.error('Failed to load user branch options:', error);
    return { branches: null, error: 'Branch options could not be loaded.' };
  }
}
