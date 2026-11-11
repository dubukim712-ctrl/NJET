'use client';

import { createClient } from '@/data/supabase/client';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;
export type UploadedDocument = {
  kind: 'payment_proof' | 'identity';
  objectPath: string;
};

export async function uploadOrderDocuments(
  proof: File | null,
  identity: File[]
): Promise<{ documents: UploadedDocument[]; error: string | null }> {
  const files = [
    ...(proof ? [{ file: proof, kind: 'payment_proof' as const }] : []),
    ...identity.map((file) => ({ file, kind: 'identity' as const })),
  ];
  if (files.some(({ file }) =>
    !MIME_EXTENSIONS[file.type] || file.size < 1 || file.size > MAX_FILE_SIZE
  )) {
    return { documents: [], error: 'Use JPG, PNG, or WebP files no larger than 5 MB each.' };
  }

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { documents: [], error: 'Your session expired. Sign in and try again.' };
  const uploaded: UploadedDocument[] = [];

  try {
    for (const { file, kind } of files) {
      const objectPath = `${user.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
      const { error } = await supabase.storage
        .from('njet-order-documents')
        .upload(objectPath, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      uploaded.push({ kind, objectPath });
    }
    return { documents: uploaded, error: null };
  } catch (uploadError) {
    try {
      if (uploaded.length) {
        const { error } = await supabase.storage
          .from('njet-order-documents')
          .remove(uploaded.map((file) => file.objectPath));
        if (error) throw error;
      }
    } catch (cleanupError) {
      console.error('Could not remove a partially uploaded checkout file.', cleanupError);
      return {
        documents: [],
        error: 'Upload failed; some private files may remain. Contact the store before retrying.',
      };
    }
    console.error('Could not upload checkout documents.', uploadError);
    return { documents: [], error: 'A document could not be uploaded. Please try again.' };
  }
}
