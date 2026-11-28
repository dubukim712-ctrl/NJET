'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requireFullAccess } from '@/data/auth/guards';
import {
  removeStoredObject,
  validateSettingsImage,
} from '@/data/commerce/system-settings-assets';
import { businessSettingsSchema } from '@/lib/validations/system-settings';

const BRANDING_BUCKET = 'njet-storefront-branding';

export async function saveBusinessSettingsAction(
  payload: unknown
): Promise<ActionResult<{ warning?: string }>> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = businessSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the business information and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    if (parsed.data.logoPath) {
      await validateSettingsImage(
        supabase,
        BRANDING_BUCKET,
        parsed.data.logoPath,
        'business logo'
      );
    }
    if (parsed.data.aboutImagePath) {
      await validateSettingsImage(
        supabase,
        BRANDING_BUCKET,
        parsed.data.aboutImagePath,
        'About Us photo'
      );
    }

    let previousHeroPath: string | null = null;
    const heroPath = parsed.data.heroImagePath;
    if (heroPath !== undefined) {
      if (heroPath) await validateSettingsImage(supabase, BRANDING_BUCKET, heroPath, 'hero photo');
      const { data, error } = await supabase.from('business_settings').select('hero_image_path').eq('id', 1).maybeSingle();
      if (error?.code === '42703') {
        return { success: false, error: 'Apply the storefront hero image migration before changing the hero photo.' };
      }
      if (error) throw error;
      previousHeroPath = data?.hero_image_path ?? null;
    }

    const { data: previous, error: previousError } = await supabase
      .from('business_settings')
      .select('logo_path, about_image_path')
      .eq('id', 1)
      .maybeSingle();
    if (previousError) throw previousError;

    const { error } = await supabase.from('business_settings').upsert({
      id: 1,
      business_name: parsed.data.businessName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      business_hours: parsed.data.businessHours,
      logo_path: parsed.data.logoPath,
      about_image_path: parsed.data.aboutImagePath,
      ...(heroPath !== undefined ? { hero_image_path: heroPath } : {}),
    }, { onConflict: 'id' });
    if (error) throw error;

    const obsoleteImages = [
      heroPath !== undefined && heroPath !== previousHeroPath ? previousHeroPath : null,
      previous?.logo_path !== parsed.data.logoPath
        ? previous?.logo_path
        : null,
      previous?.about_image_path !== parsed.data.aboutImagePath
        ? previous?.about_image_path
        : null,
    ].filter((path): path is string => Boolean(path));
    const cleanupResults = await Promise.all(
      obsoleteImages.map((path) =>
        removeStoredObject(supabase, BRANDING_BUCKET, path)
      )
    );
    const warning = cleanupResults.some((removed) => !removed)
      ? 'Business information was saved, but one or more previous images could not be removed.'
      : undefined;

    revalidatePath('/admin/settings');
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/checkout');
    return { success: true, data: { warning } };
  } catch (error) {
    console.error('Could not save business information.', error);
    return {
      success: false,
      error: toUserFriendlyError(error, 'Could not save business information. Please try again.'),
    };
  }
}
