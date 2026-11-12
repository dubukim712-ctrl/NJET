import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { StorefrontBranchLocationsSchema } from '@/lib/validations/storefront-branches';
import type { StorefrontBranchLocation } from '@/lib/validations/storefront-branches';

type StorefrontBranchesResult =
  | { data: StorefrontBranchLocation[]; error: null }
  | { data: null; error: string };

export async function getStorefrontBranches(): Promise<StorefrontBranchesResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('storefront_branch_locations');
    if (error) throw error;

    const parsed = StorefrontBranchLocationsSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error('Storefront branch response failed validation.');
    }

    return { data: parsed.data, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load storefront branches.', error);
    return {
      data: null,
      error: 'Branch locations could not be loaded. Please try again later.',
    };
  }
}
