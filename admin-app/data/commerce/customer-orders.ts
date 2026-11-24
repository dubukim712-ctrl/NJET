import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

export type CustomerOrder = Pick<
  OrderRow,
  | 'id' | 'order_number' | 'customer_name' | 'fulfillment' | 'branch_name'
  | 'delivery_zone_name' | 'payment_method' | 'status' | 'total_minor'
  | 'discount_total_minor' | 'applied_coupon_code'
  | 'reservation_due_minor' | 'balance_due_minor' | 'online_due_minor'
  | 'home_credit_downpayment_due_minor' | 'created_at'
> & {
  items: (
    Pick<
      OrderItemRow,
      | 'order_id' | 'product_name' | 'variant_name' | 'product_type'
      | 'id'
      | 'quantity' | 'unit_price_minor' | 'regular_unit_price_minor'
      | 'discount_unit_minor' | 'discount_name_snapshot'
    > & { productId: string | null }
  )[];
  invoiceNo: string | null;
  hasCertificate: boolean;
  hasReceipt: boolean;
};

export type CustomerOrdersCursor = {
  createdAt: string;
  id: string;
};

export type CustomerOrdersPage = {
  orders: CustomerOrder[];
  nextCursor: CustomerOrdersCursor | null;
};

const ORDER_PAGE_SIZE = 20;
const ORDER_ITEM_BATCH_SIZE = 250;

async function loadOrderItems(supabase: SupabaseClient, orderIds: string[]) {
  const byOrder = new Map<string, (CustomerOrder['items'][number] & { created_at: string })[]>();
  let lastId: string | undefined;

  while (true) {
    let query = supabase
      .from('order_items')
      .select(`
        id, order_id, created_at, product_name, variant_name, product_type, quantity,
        unit_price_minor, regular_unit_price_minor, discount_unit_minor,
        discount_name_snapshot,
        variant:product_variants!order_items_variant_id_fkey(
          product:products!product_variants_product_id_fkey(id)
        )
      `)
      .in('order_id', orderIds)
      .order('id')
      .limit(ORDER_ITEM_BATCH_SIZE);
    if (lastId) query = query.gt('id', lastId);

    const { data, error } = await query;
    if (error) throw error;

    for (const { variant, ...item } of data) {
      const items = byOrder.get(item.order_id) ?? [];
      items.push({ ...item, productId: variant?.product?.id ?? null });
      byOrder.set(item.order_id, items);
    }
    // A server-side row cap can make a nonfinal batch shorter than requested.
    if (!data.length) break;
    lastId = data[data.length - 1].id;
  }

  for (const items of byOrder.values()) {
    items.sort((first, second) => first.created_at.localeCompare(second.created_at));
  }
  return byOrder;
}

export async function getCustomerOrders(
  supabase: SupabaseClient,
  userId: string,
  cursor: CustomerOrdersCursor | null = null,
  orderId?: string,
): Promise<{ data: CustomerOrdersPage | null; error: string | null }> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        id, order_number, customer_name, fulfillment, branch_name, delivery_zone_name,
        payment_method, status, total_minor, discount_total_minor, applied_coupon_code,
        reservation_due_minor, balance_due_minor,
        online_due_minor, home_credit_downpayment_due_minor, created_at
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(orderId ? 1 : ORDER_PAGE_SIZE + 1);
    if (orderId) query = query.eq('id', orderId);
    if (cursor) {
      // Keep the database timestamp precision and use the ID to break ties.
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data: rows, error: orderError } = await query;
    if (orderError) throw orderError;
    if (!rows.length) return { data: { orders: [], nextCursor: null }, error: null };

    const orders = rows.slice(0, ORDER_PAGE_SIZE);
    const lastOrder = orders[orders.length - 1];
    const nextCursor = rows.length > ORDER_PAGE_SIZE
      ? { createdAt: lastOrder.created_at, id: lastOrder.id }
      : null;
    const orderIds = orders.map((order) => order.id);
    const [itemsByOrder, invoicesResult, certificatesResult, receiptsResult] = await Promise.all([
      loadOrderItems(supabase, orderIds),
      supabase
        .from('order_invoices')
        .select('order_id, invoice_no')
        .in('order_id', orderIds),
      supabase
        .from('order_certificates')
        .select('order_id')
        .in('order_id', orderIds),
      supabase
        .from('order_receipts')
        .select('order_id')
        .in('order_id', orderIds),
    ]);
    if (invoicesResult.error) throw invoicesResult.error;
    if (certificatesResult.error) throw certificatesResult.error;
    if (receiptsResult.error) throw receiptsResult.error;
    const certificateOrderIds = new Set(certificatesResult.data.map(({ order_id }) => order_id));
    const receiptOrderIds = new Set(receiptsResult.data.map(({ order_id }) => order_id));

    return {
      data: {
        orders: orders.map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
          invoiceNo: invoicesResult.data.find((invoice) => invoice.order_id === order.id)?.invoice_no ?? null,
          hasCertificate: certificateOrderIds.has(order.id),
          hasReceipt: receiptOrderIds.has(order.id),
        })),
        nextCursor,
      },
      error: null,
    };
  } catch (error) {
    console.error('Could not load customer orders.', error);
    return {
      data: null,
      error: 'Order history could not be loaded. Please try again later.',
    };
  }
}

export type CustomerOrderDocumentKind = 'certificate' | 'receipt';

const orderDocuments = {
  certificate: { table: 'order_certificates', bucket: 'njet-order-certificates' },
  receipt: { table: 'order_receipts', bucket: 'njet-order-receipts' },
} as const;

export async function getCustomerOrderDocumentUrl(
  supabase: SupabaseClient,
  userId: string,
  orderId: string,
  kind: CustomerOrderDocumentKind,
): Promise<string | null> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('customer_id', userId)
    .eq('status', 'completed')
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return null;

  const { table, bucket } = orderDocuments[kind];
  const { data: document, error: documentError } = await supabase
    .from(table)
    .select('object_path')
    .eq('order_id', order.id)
    .maybeSingle();
  if (documentError) throw documentError;
  if (!document) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(document.object_path, 60, { download: true });
  if (error) throw error;
  return data.signedUrl;
}
