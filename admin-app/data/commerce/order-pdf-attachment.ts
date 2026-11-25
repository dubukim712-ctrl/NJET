import type { createClient } from '@/data/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AttachmentError = { code?: string; message: string };
type Result =
  | { status: 'attached' | 'uncertain' }
  | { status: 'rejected'; error: AttachmentError };

export async function reconcileOrderPdfAttachment(
  save: () => PromiseLike<{ error: AttachmentError | null }>,
  readPath: () => PromiseLike<{ data: { object_path: string } | null; error: unknown }>,
  objectPath: string,
): Promise<Result> {
  try {
    const { error } = await save();
    if (!error) return { status: 'attached' };

    // These responses explicitly reject the call or roll back the transaction.
    if (/^(P0001|PGRST202|42501|22[0-9A-Z]{3}|23[0-9A-Z]{3})$/.test(error.code ?? '')) {
      return { status: 'rejected', error };
    }
  } catch (error) {
    console.error('Order PDF attachment response was interrupted.', error);
  }

  try {
    const { data, error } = await readPath();
    if (!error && data?.object_path === objectPath) return { status: 'attached' };
  } catch (error) {
    console.error('Could not reconcile the order PDF attachment.', error);
  }
  // The RPC may still commit, so leave the uploaded PDF in place.
  return { status: 'uncertain' };
}

export async function removeUnattachedOrderPdf(supabase: SupabaseClient, bucket: string, objectPath: string) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Could not remove an unattached order PDF.', error);
    return false;
  }
}
