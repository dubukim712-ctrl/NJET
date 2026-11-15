'use server';

import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import {
  buildSalesReceiptFromTemplate,
  SalesReceiptTemplateError,
} from '@/data/commerce/sales-receipt';
import { buildSalesReceiptData } from '@/data/commerce/sales-receipt-data';
import {
  loadSalesReceiptImage,
  SalesReceiptImageError,
} from '@/data/commerce/sales-receipt-images';
import { PERMISSIONS } from '@/lib/permissions';
import { orderDocumentIdSchema } from '@/lib/validations/order-documents';
import type { createClient } from '@/data/supabase/server';

const RECEIPT_TEMPLATE_BUCKET = 'njet-sales-receipt-templates';
const RECEIPT_BUCKET = 'njet-order-receipts';
const PRODUCT_IMAGE_BUCKET = 'njet-product-images';
const BUSINESS_LOGO_BUCKET = 'njet-storefront-branding';
const RECEIPT_MAX_SIZE = 2 * 1024 * 1024;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function removeUnattachedReceipt(
  supabase: SupabaseClient,
  objectPath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .remove([objectPath]);
    if (error) {
      console.error('Could not remove an unattached sales receipt.', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Could not remove an unattached sales receipt.', error);
    return false;
  }
}

export async function generateOrderReceiptAction(
  payload: unknown
): Promise<ActionResult<{ warning?: string }>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.ordersManage,
    '/admin/orders'
  );
  const parsed = orderDocumentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Select a valid order.' };
  }

  let uploadedPath: string | null = null;
  try {
    const orderResult = await supabase
      .from('orders')
      .select('id, order_number, customer_name, contact_number, branch_name, fulfillment, delivery_zone_name, address_line1, barangay, city, province, postal_code, payment_method, payment_provider, total_minor, delivery_fee_minor, home_credit_downpayment_due_minor, balance_due_minor, completed_at, updated_at, status')
      .eq('id', parsed.data.orderId)
      .maybeSingle();
    if (orderResult.error) throw orderResult.error;
    const order = orderResult.data;
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status !== 'completed') {
      return { success: false, error: 'Sales receipts can only be generated for completed orders.' };
    }

    const [businessResult, itemsResult, paymentsResult, invoiceResult, certificateResult, homeCreditResult, previousResult, templateResult] =
      await Promise.all([
        supabase
          .from('business_settings')
          .select('business_name, address, phone, email, logo_path')
          .eq('id', 1)
          .maybeSingle(),
        supabase
          .from('order_items')
          .select('id, variant_id, product_name, product_type, variant_name, sku, quantity, unit_price_minor')
          .eq('order_id', order.id)
          .order('created_at')
          .limit(100),
        supabase
          .from('order_payment_transactions')
          .select('transaction_type, payment_method, payment_provider, amount_minor, is_downpayment, reference')
          .eq('order_id', order.id)
          .order('created_at')
          .limit(100),
        supabase
          .from('order_invoices')
          .select('invoice_no')
          .eq('order_id', order.id)
          .maybeSingle(),
        supabase
          .from('order_certificates')
          .select('certificate_number')
          .eq('order_id', order.id)
          .maybeSingle(),
        supabase
          .from('order_home_credit_details')
          .select('home_credit_acc_no, downpayment_minor, terms_months, monthly_payment_minor')
          .eq('order_id', order.id)
          .maybeSingle(),
        supabase
          .from('order_receipts')
          .select('object_path')
          .eq('order_id', order.id)
          .maybeSingle(),
        supabase
          .from('sales_receipt_templates')
          .select('object_path, template_version')
          .eq('id', 1)
          .maybeSingle(),
      ]);
    if (businessResult.error) throw businessResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (invoiceResult.error) throw invoiceResult.error;
    if (certificateResult.error) throw certificateResult.error;
    if (homeCreditResult.error) throw homeCreditResult.error;
    if (previousResult.error) throw previousResult.error;
    if (templateResult.error) throw templateResult.error;
    if (!businessResult.data) {
      throw new Error('Business information is not configured.');
    }
    if (!itemsResult.data.length) {
      throw new Error('This order has no items for a sales receipt.');
    }
    const [unitsResult, variantsResult] = await Promise.all([
      supabase
        .from('ebike_units')
        .select('order_item_id, serial_number, motor_number')
        .in('order_item_id', itemsResult.data.map((item) => item.id))
        .order('serial_number')
        .limit(3000),
      supabase
        .from('product_variants')
        .select('id, image_path')
        .in('id', itemsResult.data.map((item) => item.variant_id))
        .limit(100),
    ]);
    if (unitsResult.error) throw unitsResult.error;
    if (variantsResult.error) throw variantsResult.error;
    for (const item of itemsResult.data.filter((entry) => entry.product_type === 'ebike')) {
      const units = unitsResult.data.filter((unit) => unit.order_item_id === item.id);
      if (
        units.length !== item.quantity ||
        units.some((unit) => !unit.serial_number || !unit.motor_number)
      ) {
        return {
          success: false,
          error: 'Complete e-bike serial and motor number identification before generating this receipt.',
        };
      }
    }

    if (!templateResult.data) {
      return {
        success: false,
        error: 'Upload a sales receipt template in Settings > Documents before generating a receipt.',
      };
    }
    const imageItem = itemsResult.data.find((item) => item.product_type === 'ebike')
      ?? itemsResult.data[0];
    const variantImagePath = variantsResult.data.find(
      (variant) => variant.id === imageItem.variant_id
    )?.image_path ?? null;
    const [businessLogo, variantImage] = await Promise.all([
      loadSalesReceiptImage(
        supabase,
        BUSINESS_LOGO_BUCKET,
        businessResult.data.logo_path,
        'business logo'
      ),
      loadSalesReceiptImage(
        supabase,
        PRODUCT_IMAGE_BUCKET,
        variantImagePath,
        'product variant image'
      ),
    ]);
    const { data: templateFile, error: templateError } = await supabase.storage
      .from(RECEIPT_TEMPLATE_BUCKET)
      .download(templateResult.data.object_path);
    if (templateError || !templateFile) {
      throw new SalesReceiptTemplateError(
        'The configured sales receipt template could not be downloaded.'
      );
    }
    const bytes = await buildSalesReceiptFromTemplate(
      new Uint8Array(await templateFile.arrayBuffer()),
      buildSalesReceiptData({
        order,
        invoiceNo: invoiceResult.data?.invoice_no ?? null,
        certificateNumber: certificateResult.data?.certificate_number ?? null,
        items: itemsResult.data,
        payments: paymentsResult.data,
        business: businessResult.data,
        homeCredit: homeCreditResult.data,
        units: unitsResult.data,
      }),
      { businessLogo, variantImage }
    );
    if (bytes.byteLength > RECEIPT_MAX_SIZE) {
      return { success: false, error: 'The generated sales receipt is too large.' };
    }

    const objectPath = `${order.id}/${randomUUID()}.pdf`;
    const uploadResult = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(objectPath, Buffer.from(bytes), {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadResult.error) throw uploadResult.error;
    uploadedPath = objectPath;

    const saveResult = await supabase.rpc('save_order_receipt', {
      p_order_id: order.id,
      p_object_path: objectPath,
      p_file_size: bytes.byteLength,
      p_template_version: templateResult.data.template_version,
    });
    if (saveResult.error) {
      const cleanupSucceeded = await removeUnattachedReceipt(supabase, objectPath);
      uploadedPath = null;
      if (saveResult.error.code === 'PGRST202') {
        return {
          success: false,
          error: 'The sales receipt migration is missing. Run supabase/migrations/20240101000073_sales_receipt_templates.sql, then refresh this page.',
        };
      }
      return {
        success: false,
        error: cleanupSucceeded
          ? saveResult.error.code === 'P0001'
            ? saveResult.error.message
            : 'Could not attach the sales receipt.'
          : 'The receipt could not be attached and its temporary file could not be removed. Contact an administrator.',
      };
    }

    uploadedPath = null;
    revalidatePath('/admin/orders');
    revalidatePath('/dashboard/orders');

    if (previousResult.data?.object_path) {
      const removed = await removeUnattachedReceipt(
        supabase,
        previousResult.data.object_path
      );
      if (!removed) {
        return {
          success: true,
          data: { warning: 'The new sales receipt is attached, but the previous file could not be removed.' },
        };
      }
    }

    return { success: true, data: {} };
  } catch (error) {
    const cleanupSucceeded = uploadedPath
      ? await removeUnattachedReceipt(supabase, uploadedPath)
      : true;
    console.error('Could not generate the sales receipt.', error);
    const message = error instanceof SalesReceiptTemplateError ||
      error instanceof SalesReceiptImageError
      ? error.message
      : error instanceof Error && error.message === 'Business information is not configured.'
        ? error.message
        : 'Could not generate the sales receipt. Please try again.';
    return {
      success: false,
      error: cleanupSucceeded
        ? message
        : 'Receipt generation failed, and its temporary file could not be removed. Contact an administrator.',
    };
  }
}
