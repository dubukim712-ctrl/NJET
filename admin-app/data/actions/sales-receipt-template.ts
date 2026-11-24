'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requireFullAccess } from '@/data/auth/guards';
import {
  SalesReceiptTemplateError,
  validateSalesReceiptTemplate,
} from '@/data/commerce/sales-receipt';
import { removeStoredObject } from '@/data/commerce/system-settings-assets';
import { salesReceiptTemplatePathSchema } from '@/lib/validations/system-settings';

const RECEIPT_TEMPLATE_BUCKET = 'njet-sales-receipt-templates';
const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024;

export async function saveSalesReceiptTemplateAction(
  payload: unknown
): Promise<ActionResult<{ version: string; warning?: string }>> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = salesReceiptTemplatePathSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Upload a valid sales receipt template.' };
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from(RECEIPT_TEMPLATE_BUCKET)
      .download(parsed.data);
    if (downloadError || !file) {
      throw new SalesReceiptTemplateError(
        'The uploaded sales receipt template could not be read.'
      );
    }
    if (file.size < 1 || file.size > MAX_TEMPLATE_SIZE) {
      throw new SalesReceiptTemplateError(
        'The sales receipt template must be no larger than 5 MB.'
      );
    }
    await validateSalesReceiptTemplate(
      new Uint8Array(await file.arrayBuffer())
    );

    const previousResult = await supabase
      .from('sales_receipt_templates')
      .select('object_path')
      .eq('id', 1)
      .maybeSingle();
    if (previousResult.error) throw previousResult.error;

    const version = `receipt-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
    const { error } = await supabase
      .from('sales_receipt_templates')
      .upsert({
        id: 1,
        object_path: parsed.data,
        template_version: version,
      }, { onConflict: 'id' });
    if (error) throw error;

    let warning: string | undefined;
    if (
      previousResult.data?.object_path &&
      previousResult.data.object_path !== parsed.data
    ) {
      const removed = await removeStoredObject(
        supabase,
        RECEIPT_TEMPLATE_BUCKET,
        previousResult.data.object_path
      );
      if (!removed) {
        warning = 'The new receipt template is active, but the previous file could not be removed.';
      }
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin/orders');
    revalidatePath('/dashboard/orders');
    return { success: true, data: { version, warning } };
  } catch (error) {
    console.error('Could not save the sales receipt template.', error);
    return {
      success: false,
      error: error instanceof SalesReceiptTemplateError
        ? error.message
        : toUserFriendlyError(error, 'Could not save the sales receipt template.'),
    };
  }
}
