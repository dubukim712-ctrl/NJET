'use server';

import { revalidatePath } from 'next/cache';
import { getLinkedReleaseOrderIds, getReleaseStaffContext } from '@/data/commerce/customer-releases';
import { removeStoredObject, validateSettingsImage } from '@/data/commerce/system-settings-assets';
import { releasesBucket, releasesPath } from '@/lib/customer-releases';
import { releaseFieldsSchema, releaseIdSchema, releaseImagePathSchema } from '@/lib/validations/customer-releases';

const linkedOrderError = 'This order already has a customer release photo.';

function isLinkedOrderConflict(error: { code: string; message: string } | null) {
  return error?.code === '23505' && error.message.includes('customer_releases_order_id_unique');
}

function refreshGallery() {
  revalidatePath(releasesPath);
  revalidatePath('/');
  revalidatePath('/dashboard');
}

export async function createCustomerRelease(payload: unknown, imagePath: unknown) {
  const context = await getReleaseStaffContext();
  const input = releaseFieldsSchema.safeParse(payload);
  const path = releaseImagePathSchema.safeParse(imagePath);
  if (!context || !path.success || !path.data.startsWith(`releases/${context.user.id}/`)) {
    return { error: 'You cannot submit this photo.' };
  }
  if (!input.success) return { error: 'Review the release fields and try again.' };

  try {
    if (input.data.order_id && (await getLinkedReleaseOrderIds(context.supabase, [input.data.order_id])).length) {
      return { error: linkedOrderError };
    }
    await validateSettingsImage(context.supabase, releasesBucket, path.data, 'release photo');
    const { error } = await context.supabase.from('customer_releases').insert({
      ...input.data,
      image_path: path.data,
      uploaded_by: context.user.id,
      is_approved: context.canApprove && input.data.is_approved,
      display_order: context.canApprove ? input.data.display_order : 0,
    });
    if (isLinkedOrderConflict(error)) return { error: linkedOrderError };
    if (error) throw error;
    refreshGallery();
    return {};
  } catch (error) {
    console.error('Could not create customer release.', error);
    return { error: 'Could not save the release photo. Check the file and completed order or branch selection.' };
  }
}

export async function updateCustomerRelease(id: unknown, payload: unknown) {
  const context = await getReleaseStaffContext();
  const key = releaseIdSchema.safeParse(id);
  const input = releaseFieldsSchema.partial().safeParse(payload);
  if (!context?.canApprove || !key.success || !input.success || !Object.keys(input.data).length) {
    return { error: 'You cannot apply that release update.' };
  }
  try {
    if (input.data.order_id && (await getLinkedReleaseOrderIds(context.supabase, [input.data.order_id], key.data)).length) {
      return { error: linkedOrderError };
    }
    const { data, error } = await context.supabase.from('customer_releases')
      .update(input.data).eq('id', key.data).select('id').maybeSingle();
    if (isLinkedOrderConflict(error)) return { error: linkedOrderError };
    if (error || !data) throw error ?? new Error('Release unavailable');
    refreshGallery();
    return {};
  } catch (error) {
    console.error('Could not update customer release.', error);
    return { error: 'Could not update the release. Refresh and try again.' };
  }
}

export async function deleteCustomerRelease(id: unknown) {
  const context = await getReleaseStaffContext();
  const key = releaseIdSchema.safeParse(id);
  if (!context || !key.success) return { error: 'You cannot remove that release.' };
  try {
    const { data, error } = await context.supabase.from('customer_releases')
      .delete().eq('id', key.data).select('image_path').maybeSingle();
    if (error || !data) return { error: 'That release could not be removed. Only admins can remove published releases.' };
    refreshGallery();
    const removed = await removeStoredObject(context.supabase, releasesBucket, data.image_path);
    return removed ? {} : { warning: 'The release was removed, but the stored photo could not be deleted.' };
  } catch (error) {
    console.error('Could not remove customer release.', error);
    return { error: 'Could not remove the release. Refresh and try again.' };
  }
}
