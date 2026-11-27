import 'server-only';

import type { createClient } from '@/data/supabase/server';
import { createServiceClient } from '@/data/supabase/service';
import { buildSalesReceiptData } from '@/data/commerce/sales-receipt-data';

type Client = Awaited<ReturnType<typeof createClient>>;
type Scope = { customerId: string; branchId?: never } | { customerId?: never; branchId: string | null };

export async function getPrintableReceipt(supabase: Client, orderId: string, scope: Scope) {
  let query = supabase.from('orders')
    .select('id, order_number, customer_name, contact_number, branch_id, branch_name, fulfillment, address_line1, barangay, city, province, postal_code, payment_method, payment_provider, total_minor, discount_total_minor, applied_coupon_code, delivery_fee_minor, balance_due_minor, home_credit_downpayment_due_minor, completed_at, updated_at')
    .eq('id', orderId)
    .eq('status', 'completed');
  if (scope.customerId !== undefined) query = query.eq('customer_id', scope.customerId);
  if (scope.branchId) query = query.eq('branch_id', scope.branchId);
  const { data: order, error } = await query.maybeSingle();
  if (error) throw error;
  if (!order) return null;

  // Customer RLS permits the order and items, but restricts linked finance and
  // unit records. Use the service client only after checking order ownership.
  const details = scope.customerId !== undefined && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceClient()
    : supabase;
  const [branch, business, items, payments, invoice, homeCredit] = await Promise.all([
    order.branch_id
      ? supabase.from('branches').select('address').eq('id', order.branch_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('business_settings').select('business_name, address, phone, email, logo_path').eq('id', 1).maybeSingle(),
    supabase.from('order_items')
      .select('id, product_name, product_type, variant_name, sku, quantity, unit_price_minor, regular_unit_price_minor, discount_name_snapshot')
      .eq('order_id', order.id).order('created_at').order('id'),
    details.from('order_payment_transactions').select('transaction_type, amount_minor').eq('order_id', order.id),
    supabase.from('order_invoices').select('invoice_no').eq('order_id', order.id).maybeSingle(),
    order.payment_method === 'home_credit'
      ? details.from('order_home_credit_details')
          .select('home_credit_acc_no, downpayment_minor, terms_months, monthly_payment_minor')
          .eq('order_id', order.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [branch, business, items, invoice]) {
    if (result.error) throw result.error;
  }
  for (const result of [payments, homeCredit]) {
    if (result.error && result.error.code !== '42501') throw result.error;
  }

  const ebikeItems = (items.data ?? []).filter((item) => item.product_type === 'ebike');
  const units: { order_item_id: string | null; serial_number: string | null; motor_number: string | null }[] = [];
  if (ebikeItems.length) {
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error: unitsError } = await details.from('ebike_units')
        .select('order_item_id, serial_number, motor_number')
        .in('order_item_id', ebikeItems.map(({ id }) => id))
        .order('id').range(offset, offset + pageSize - 1);
      if (unitsError?.code === '42501') break;
      if (unitsError) throw unitsError;
      units.push(...data);
      if (data.length < pageSize) break;
    }
  }

  const logoPath = business.data?.logo_path;
  return {
    logoUrl: logoPath ? supabase.storage.from('njet-storefront-branding').getPublicUrl(logoPath).data.publicUrl : null,
    receipt: buildSalesReceiptData({
      order, items: items.data ?? [], payments: payments.data ?? [], units,
      invoiceNo: invoice.data?.invoice_no ?? null, homeCredit: homeCredit.data ?? null,
      business: business.data ?? { business_name: 'Noel & Jane E-bike Trading', address: '', email: '', phone: '' },
      branchAddress: branch.data?.address ?? '',
    }),
  };
}
