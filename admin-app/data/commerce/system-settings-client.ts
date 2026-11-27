'use client';

import { removeUnusedSystemSettingsAssetAction } from '@/data/actions/system-settings';
import { createClient } from '@/data/supabase/client';
import type { PaymentProvider } from '@/types/commerce-tables';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const BRANDING_BUCKET = 'njet-storefront-branding';
const PAYMENT_MEDIA_BUCKET = 'njet-payment-recipient-media';

export type SettingsAsset =
  | { kind: 'business-logo'; path: string }
  | { kind: 'about-image'; path: string }
  | { kind: 'hero-image'; path: string }
  | { kind: 'payment-qr'; provider: PaymentProvider; path: string };

export async function uploadSystemSettingsAsset(
  file: File,
  kind: SettingsAsset['kind'],
  provider?: PaymentProvider
): Promise<{ path: string | null; error: string | null }> {
  let bucket: string;
  let path: string;
  let contentType: string;

  if (kind !== 'payment-qr') {
    const extension = IMAGE_EXTENSIONS[file.type];
    if (!extension || file.size < 1 || file.size > MAX_IMAGE_SIZE) {
      return {
        path: null,
        error: kind !== 'business-logo'
          ? 'Use a JPG, PNG, or WebP photo no larger than 5 MB.'
          : 'Use a JPG, PNG, or WebP logo no larger than 5 MB.',
      };
    }
    bucket = BRANDING_BUCKET;
    path = `${kind === 'hero-image' ? 'hero' : kind === 'about-image' ? 'about' : 'logos'}/${crypto.randomUUID()}.${extension}`;
    contentType = file.type;
  } else {
    const extension = IMAGE_EXTENSIONS[file.type];
    if (!provider || !extension || file.size < 1 || file.size > MAX_IMAGE_SIZE) {
      return { path: null, error: 'Use a JPG, PNG, or WebP image no larger than 5 MB.' };
    }
    bucket = PAYMENT_MEDIA_BUCKET;
    path = `recipients/${provider}/qr/${crypto.randomUUID()}.${extension}`;
    contentType = file.type;
  }

  try {
    const { error } = await createClient()
      .storage.from(bucket)
      .upload(path, file, { upsert: false, contentType });
    if (error) throw error;
    return { path, error: null };
  } catch (error) {
    console.error('Could not upload a system settings asset.', error);
    return { path: null, error: 'Could not upload this file. Please try again.' };
  }
}

export async function cleanupSystemSettingsAsset(path: string): Promise<boolean> {
  try {
    const result = await removeUnusedSystemSettingsAssetAction(path);
    return result.success;
  } catch (error) {
    console.error('Could not remove an unused settings asset.', error);
    return false;
  }
}
