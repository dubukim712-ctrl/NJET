'use server';

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

    const { data: previous, error: previousError } = await supabase
      .from('business_settings')
      .select('logo_path')
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
    }, { onConflict: 'id' });
    if (error) throw error;

    let warning: string | undefined;
    if (previous?.logo_path && previous.logo_path !== parsed.data.logoPath) {
      const removed = await removeStoredObject(
        supabase,
        BRANDING_BUCKET,
        previous.logo_path
      );
      if (!removed) warning = 'Business information was saved, but the previous logo could not be removed.';
    }

    revalidatePath('/admin/settings');
    revalidatePath('/dashboard');
    revalidatePath('/shop');
    revalidatePath('/checkout');
    return { success: true, data: { warning } };
  } catch (error) {
    console.error('Could not save business information.', error);
    return {
      success: false,
      error: 'Could not save business information. Please try again.',
    };
  }
}
