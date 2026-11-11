'use client';

import { createClient } from '@/data/supabase/client';
import { removeUnusedProductImageAction } from '@/data/actions/commerce-admin';

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function uploadCommerceProductImage(
  file: File
): Promise<{ path: string | null; error: string | null }> {
  if (!IMAGE_TYPES[file.type] || file.size < 1 || file.size > MAX_FILE_SIZE) {
    return { path: null, error: 'Use a JPG, PNG, or WebP image no larger than 5 MB.' };
  }
  try {
    const path = `images/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
    const { error } = await createClient()
      .storage.from('njet-product-images')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return { path, error: null };
  } catch (error) {
    console.error('Could not upload the product image.', error);
    return { path: null, error: 'Could not upload this image. Please try again.' };
  }
}

export async function cleanupCommerceProductImage(path: string) {
  try {
    const result = await removeUnusedProductImageAction(path);
    return result.success;
  } catch (error) {
    console.error('Could not clean up an unused product image.', error);
    return false;
  }
}
