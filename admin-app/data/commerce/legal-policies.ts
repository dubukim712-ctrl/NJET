import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import {
  DEFAULT_LEGAL_POLICIES,
  LEGAL_POLICY_SLUGS,
  type LegalPolicy,
  type LegalPolicySlug,
} from '@/data/legal-policies';
import { legalPolicySaveSchema } from '@/lib/validations/legal-policies';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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
    .from('storefront_legal_policy_versions')
    .select('slug, version, intro, sections, created_at')
    .eq('slug', slug)
    .order('id', { ascending: false })
    .limit(1)
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

export async function getCurrentLegalPolicyVersions(
  supabase: SupabaseClient
): Promise<Record<LegalPolicySlug, string>> {
  const results = await Promise.all(
    LEGAL_POLICY_SLUGS.map((slug) =>
      supabase
        .from('storefront_legal_policy_versions')
        .select('version')
        .eq('slug', slug)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );
  for (const result of results) {
    if (result.error) throw result.error;
  }

  return {
    terms: results[0].data?.version ?? DEFAULT_LEGAL_POLICIES.terms.version,
    'return-policy':
      results[1].data?.version ?? DEFAULT_LEGAL_POLICIES['return-policy'].version,
    privacy: results[2].data?.version ?? DEFAULT_LEGAL_POLICIES.privacy.version,
  };
}

export async function getStorefrontLegalPolicy(slug: LegalPolicySlug): Promise<{
  data: LegalPolicy | null;
  error: string | null;
}> {
  try {
    const data = await getCurrentLegalPolicy(await createClient(), slug);
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
