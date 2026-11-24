'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requireFullAccess } from '@/data/auth/guards';
import { DEFAULT_LEGAL_POLICIES } from '@/data/legal-policies';
import { legalPolicySaveSchema } from '@/lib/validations/legal-policies';

const POLICY_CODES = {
  terms: 'TERMS',
  'return-policy': 'RETURNS',
  privacy: 'PRIVACY',
} as const;

export async function saveStorefrontLegalPolicyAction(
  payload: unknown
): Promise<ActionResult<{ version: string }>> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = legalPolicySaveSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message
        ?? 'Review the policy content and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { data: current, error } = await supabase
      .from('storefront_legal_policy_versions')
      .select('version')
      .eq('slug', parsed.data.slug)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const defaultVersion = DEFAULT_LEGAL_POLICIES[parsed.data.slug].version;
    if ((current?.version ?? defaultVersion) !== parsed.data.baseVersion) {
      return {
        success: false,
        error: 'This policy changed in another session. Refresh settings before saving again.',
      };
    }

    const version = `NJET-${POLICY_CODES[parsed.data.slug]}-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${randomUUID()}`;
    const { error: insertError } = await supabase
      .from('storefront_legal_policy_versions')
      .insert({
        slug: parsed.data.slug,
        version,
        intro: parsed.data.intro,
        sections: parsed.data.sections,
      });
    if (insertError) throw insertError;

    revalidatePath('/admin/settings');
    revalidatePath('/terms');
    revalidatePath('/return-policy');
    revalidatePath('/privacy');
    revalidatePath('/checkout');
    return { success: true, data: { version } };
  } catch (error) {
    console.error(`Could not save the ${parsed.data.slug} policy.`, error);
    return {
      success: false,
      error: toUserFriendlyError(error, 'Could not save this policy. Please try again.'),
    };
  }
}
