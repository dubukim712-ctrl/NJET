'use server';

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
    revalidatePath('/dashboard/orders');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not save the invoice number.', error);
    return { success: false, error: 'Could not save the invoice number.' };
  }
}
