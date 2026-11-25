'use server';

import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import {
  buildOwnershipCertificate,
  buildOwnershipCertificateFromTemplate,
  OwnershipCertificateTemplateError,
} from '@/data/commerce/ownership-certificate';
import { reconcileOrderPdfAttachment, removeUnattachedOrderPdf } from '@/data/commerce/order-pdf-attachment';
import { PERMISSIONS } from '@/lib/permissions';
import {
  orderCertificateSchema,
  orderInvoiceSchema,
} from '@/lib/validations/order-documents';

const CERTIFICATE_BUCKET = 'njet-order-certificates';
const CERTIFICATE_TEMPLATE_BUCKET = 'njet-certificate-templates';
const SAMPLE_CERTIFICATE_TEMPLATE_VERSION = 'sample-v1';
const CERTIFICATE_MAX_SIZE = 2 * 1024 * 1024;

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

export async function generateOrderCertificateAction(
  payload: unknown
): Promise<ActionResult<{ warning?: string }>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.ordersManage,
    '/admin/orders'
  );
  const parsed = orderCertificateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Enter a valid certificate number.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let uploadedPath: string | null = null;
  try {
    const orderResult = await supabase
      .from('orders')
      .select('id, customer_name, address_line1, barangay, city, province, postal_code, branch_name, status')
      .eq('id', parsed.data.orderId)
      .maybeSingle();
    if (orderResult.error) throw orderResult.error;
    const order = orderResult.data;
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status !== 'completed') {
      return {
        success: false,
        error: 'Certificates can only be generated for completed orders.',
      };
    }

    const itemsResult = await supabase
      .from('order_items')
      .select('product_name, product_type, variant_name, quantity')
      .eq('order_id', order.id)
      .order('created_at')
      .limit(100);
    if (itemsResult.error) throw itemsResult.error;
    const ebikeItems = itemsResult.data.filter(
      (item) => item.product_type === 'ebike'
    );
    if (!ebikeItems.length) {
      return {
        success: false,
        error: 'Ownership certificates are only available for e-bike orders.',
      };
    }

    const previousResult = await supabase
      .from('order_certificates')
      .select('object_path')
      .eq('order_id', order.id)
      .maybeSingle();
    if (previousResult.error) throw previousResult.error;

    const certificateData = {
      customerName: order.customer_name,
      customerAddress: [
        order.address_line1,
        order.barangay,
        order.city,
        order.province,
        order.postal_code,
      ].filter(Boolean).join(', '),
      products: ebikeItems.map((item) => ({
        productName: item.product_name,
        variantName: item.variant_name,
        quantity: item.quantity,
      })),
      branchName: order.branch_name,
      certificateNumber: parsed.data.certificateNumber,
    };
    let templateVersion = SAMPLE_CERTIFICATE_TEMPLATE_VERSION;
    let bytes: Uint8Array;
    const templateResult = await supabase
      .from('ownership_certificate_templates')
      .select('object_path, template_version')
      .eq('id', 1)
      .maybeSingle();
    if (templateResult.error) throw templateResult.error;

    if (templateResult.data) {
      const { data: templateFile, error: templateError } = await supabase.storage
        .from(CERTIFICATE_TEMPLATE_BUCKET)
        .download(templateResult.data.object_path);
      if (templateError || !templateFile) {
        throw new OwnershipCertificateTemplateError(
          'The configured ownership certificate template could not be downloaded.'
        );
      }
      bytes = await buildOwnershipCertificateFromTemplate(
        new Uint8Array(await templateFile.arrayBuffer()),
        certificateData
      );
      templateVersion = templateResult.data.template_version;
    } else {
      bytes = await buildOwnershipCertificate(certificateData);
    }

    if (bytes.byteLength > CERTIFICATE_MAX_SIZE) {
      return { success: false, error: 'The generated certificate is too large.' };
    }

    const objectPath = `${order.id}/${randomUUID()}.pdf`;
    const uploadResult = await supabase.storage
      .from(CERTIFICATE_BUCKET)
      .upload(objectPath, Buffer.from(bytes), {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadResult.error) throw uploadResult.error;
    uploadedPath = objectPath;

    const attachment = await reconcileOrderPdfAttachment(
      () => supabase.rpc('save_order_certificate', {
        p_order_id: order.id,
        p_object_path: objectPath,
        p_file_size: bytes.byteLength,
        p_template_version: templateVersion,
        p_certificate_number: parsed.data.certificateNumber,
      }),
      () => supabase.from('order_certificates').select('object_path').eq('order_id', order.id).maybeSingle(),
      objectPath,
    );
    uploadedPath = null;
    if (attachment.status === 'uncertain') {
      revalidatePath('/admin/orders');
      revalidatePath('/dashboard/orders');
      return { success: false, error: 'Could not confirm the certificate attachment. Reload the order and check its documents before trying again.' };
    }
    if (attachment.status === 'rejected') {
      const removed = await removeUnattachedOrderPdf(supabase, CERTIFICATE_BUCKET, objectPath);
      const message = rpcError(attachment.error, 'Could not attach the certificate.', '20240101000074_order_certificate_number.sql');
      return { success: false, error: removed ? message : message + ' The temporary file could not be removed.' };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/dashboard/orders');

    if (previousResult.data?.object_path) {
      const removed = await removeUnattachedOrderPdf(
        supabase, CERTIFICATE_BUCKET,
        previousResult.data.object_path
      );
      if (!removed) {
        return {
          success: true,
          data: { warning: 'The new certificate is attached, but the previous file could not be removed.' },
        };
      }
    }

    return { success: true, data: {} };
  } catch (error) {
    const cleanupSucceeded = uploadedPath
      ? await removeUnattachedOrderPdf(supabase, CERTIFICATE_BUCKET, uploadedPath)
      : true;
    console.error('Could not generate the ownership certificate.', error);
    const errorMessage = error instanceof OwnershipCertificateTemplateError
      ? error.message
      : 'Could not generate the ownership certificate. Please try again.';
    return {
      success: false,
      error: cleanupSucceeded
        ? errorMessage
        : 'Certificate generation failed, and its temporary file could not be removed. Contact an administrator.',
    };
  }
}
