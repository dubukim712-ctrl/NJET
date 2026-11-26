import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getStorefrontBranches } from '@/data/commerce/storefront-branches';
import { getStorefrontBusinessInfo } from '@/data/commerce/system-settings';
import { createClient } from '@/data/supabase/server';

export const getPublicStorefrontInfo = cache(async () => {
  const client = await createClient();
  const [business, branches] = await Promise.all([
    getStorefrontBusinessInfo(client),
    getStorefrontBranches(),
  ]);
  return { business, branches };
});

const reviewsSchema = z.array(z.object({
  id: z.string(), product_name: z.string(), slug: z.string(),
  rating: z.number(), comment: z.string(),
  reviewer_name: z.string().nullable(), branch_name: z.string(),
}));

export type StorefrontHomeReview = z.infer<typeof reviewsSchema>[number];

export async function getStorefrontHomeReviews(): Promise<StorefrontHomeReview[]> {
  try {
    const client = await createClient();
    const { data, error } = await client.rpc('storefront_home_reviews');
    if (error) throw error;
    return reviewsSchema.parse(data);
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load the storefront reviews.', error);
    return [];
  }
}
