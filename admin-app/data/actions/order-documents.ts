'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  orderInvoiceSchema,
} from '@/lib/validations/order-documents';


function rpcError(
  error: { code?: string; message: string },
  fallback: string,
  migration = '20240101000027_completed_order_documents.sql'
): string {
  if (error.code === 'PGRST202') {
    return `The required order-document migration is missing. Run supabase/migrations/${migration}, then refresh this page.`;
  }
  if (error.code === 'P0001') return error.message;
  console.error(fallback, error.message);
  return fallback;
}

export async function saveOrderInvoiceAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requirePermission(
    PERMISSIONS.ordersManage,
    '/admin/orders'
  );
  const parsed = orderInvoiceSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Enter a valid invoice number.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await supabase.rpc('save_order_invoice', {
      p_order_id: parsed.data.orderId,
      p_invoice_no: parsed.data.invoiceNo,
    });
    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'That invoice number is already in use.' };
      }
      return {
        success: false,
        error: rpcError(error, 'Could not save the invoice number.'),
      };
    }
    revalidatePath('/admin/orders');
    revalidatePath('/orders');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not save the invoice number.', error);
    return { success: false, error: 'Could not save the invoice number.' };
  }
}

export async function getOrderDocumentPreviewAction(documentId: string): Promise<ActionResult<string>> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersRead, '/admin/orders');
  const parsed = z.string().uuid().safeParse(documentId);
  const unavailable = { success: false as const, error: 'This private document is unavailable.' };
  if (!parsed.success) return unavailable;

  const { data: document, error } = await supabase
    .from('order_documents')
    .select('object_path')
    .eq('id', parsed.data)
    .maybeSingle();
  if (error || !document) return unavailable;

  const { data, error: signingError } = await supabase.storage
    .from('njet-order-documents')
    .createSignedUrl(document.object_path, 60);
  if (signingError || !data?.signedUrl) return unavailable;
  return { success: true, data: data.signedUrl };
}
