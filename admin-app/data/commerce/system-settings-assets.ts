import type { createClient } from '@/data/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function matchesImageSignature(bytes: Uint8Array, path: string): boolean {
  const extension = path.split('.').pop();
  if (extension === 'jpg') {
    return bytes.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === 'png') {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
      bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  return extension === 'webp' && bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

export async function validateSettingsImage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  label: string
): Promise<void> {
  const { data: file, error } = await supabase.storage.from(bucket).download(path);
  if (error || !file || file.size < 1 || file.size > MAX_IMAGE_SIZE) {
    throw new Error(`The uploaded ${label} could not be verified.`);
  }
  if (!matchesImageSignature(new Uint8Array(await file.arrayBuffer()), path)) {
    throw new Error(`The uploaded ${label} is not a valid image file.`);
  }
}

export async function removeStoredObject(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error('Could not remove an unused settings object.', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Could not remove an unused settings object.', error);
    return false;
  }
}
