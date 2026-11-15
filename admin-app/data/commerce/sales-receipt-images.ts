import sharp from 'sharp';
import type { createClient } from '@/data/supabase/server';

export type SalesReceiptImage = {
  bytes: Uint8Array;
  contentType: 'image/jpeg';
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const RECEIPT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export class SalesReceiptImageError extends Error {}

export async function prepareSalesReceiptImage(
  bytes: Uint8Array
): Promise<SalesReceiptImage> {
  const image = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(700, 700, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return {
    bytes: new Uint8Array(image),
    contentType: 'image/jpeg',
  };
}

export async function loadSalesReceiptImage(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null,
  label: string
): Promise<SalesReceiptImage | null> {
  if (!path) return null;
  let data: Blob | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await supabase.storage.from(bucket).download(path));
  } catch (downloadError) {
    console.error(`Could not download the ${label} for a sales receipt.`, downloadError);
    throw new SalesReceiptImageError(`The ${label} could not be loaded for printing.`);
  }
  if (error || !data) {
    console.error(`Could not download the ${label} for a sales receipt.`, error);
    throw new SalesReceiptImageError(`The ${label} could not be loaded for printing.`);
  }
  if (data.size > RECEIPT_IMAGE_MAX_SIZE) {
    throw new SalesReceiptImageError(`The ${label} image is larger than 5 MB.`);
  }
  try {
    return await prepareSalesReceiptImage(
      new Uint8Array(await data.arrayBuffer())
    );
  } catch (imageError) {
    console.error(`Could not prepare the ${label} for a sales receipt.`, imageError);
    throw new SalesReceiptImageError(`The ${label} image could not be prepared for printing.`);
  }
}
