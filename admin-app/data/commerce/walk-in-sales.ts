import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type WalkInBranchOption = {
  id: string;
  name: string;
};

export type WalkInCatalogItem =
  Database['public']['Functions']['walk_in_catalog']['Returns'][number];

export type WalkInCartLine = {
  variantId: string;
  quantity: number;
};

export async function getWalkInBranchOptions(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase.rpc('walk_in_branch_options');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Could not load walk-in sale branches.', error);
    return { data: null, error: 'Branches could not be loaded.' };
  }
}

export async function getWalkInCatalog(
  supabase: SupabaseClient,
  branchId: string
) {
  try {
    const { data, error } = await supabase.rpc('walk_in_catalog', {
      p_branch_id: branchId,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Could not load the walk-in product catalog.', error);
    return { data: null, error: 'The product catalog could not be loaded.' };
  }
}
