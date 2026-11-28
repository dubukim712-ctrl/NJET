import { unstable_rethrow } from 'next/navigation';
import { createPublicClient } from '@/data/supabase/public';
import {
  DEFAULT_LEGAL_POLICIES,
  LEGAL_POLICY_SLUGS,
  type LegalPolicy,
  type LegalPolicySlug,
} from '@/data/legal-policies';
import { legalPolicySaveSchema } from '@/lib/validations/legal-policies';

type SupabaseClient = Pick<ReturnType<typeof createPublicClient>, 'rpc'>;

function formatPolicyDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function getCurrentLegalPolicy(
  supabase: SupabaseClient,
  slug: LegalPolicySlug
): Promise<LegalPolicy> {
  const { data, error } = await supabase
    .rpc('current_storefront_legal_policy', { p_slug: slug })
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_LEGAL_POLICIES[slug];

  const parsed = legalPolicySaveSchema.safeParse({
    slug: data.slug,
    baseVersion: data.version,
    intro: data.intro,
    sections: data.sections,
  });
  if (!parsed.success) {
    throw new Error('Stored legal policy content is invalid.');
  }

  return {
    ...DEFAULT_LEGAL_POLICIES[slug],
    version: data.version,
    lastUpdated: formatPolicyDate(data.created_at),
    intro: parsed.data.intro,
    sections: parsed.data.sections,
  };
}

export async function getCurrentLegalPolicies(
  supabase: SupabaseClient
): Promise<LegalPolicy[]> {
  return Promise.all(
    LEGAL_POLICY_SLUGS.map((slug) => getCurrentLegalPolicy(supabase, slug))
  );
}

export async function getStorefrontLegalPolicy(slug: LegalPolicySlug): Promise<{
  data: LegalPolicy | null;
  error: string | null;
}> {
  try {
    const data = await getCurrentLegalPolicy(createPublicClient(), slug);
    return { data, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error(`Could not load the ${slug} policy.`, error);
    return {
      data: null,
      error: 'This policy is temporarily unavailable. Please refresh the page or contact the store.',
    };
  }
}
