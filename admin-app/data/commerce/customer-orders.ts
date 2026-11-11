import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

export type CustomerOrder = Pick<
  OrderRow,
  | 'id' | 'order_number' | 'customer_name' | 'fulfillment' | 'branch_name'
  | 'delivery_zone_name' | 'payment_method' | 'status' | 'total_minor'
  | 'reservation_due_minor' | 'balance_due_minor' | 'online_due_minor'
  | 'home_credit_downpayment_due_minor' | 'created_at'
> & {
  items: Pick<
    OrderItemRow,
    | 'order_id' | 'product_name' | 'variant_name' | 'product_type'
    | 'quantity' | 'unit_price_minor'
  >[];
  invoiceNo: string | null;
  certificateUrl: string | null;
};

export async function getCustomerOrders(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: CustomerOrder[] | null; error: string | null }> {
  try {
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, order_number, customer_name, fulfillment, branch_name, delivery_zone_name,
        payment_method, status, total_minor, reservation_due_minor, balance_due_minor,
        online_due_minor, home_credit_downpayment_due_minor, created_at
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (orderError) throw orderError;
    if (!orders.length) return { data: [], error: null };

    const orderIds = orders.map((order) => order.id);
    const [itemsResult, invoicesResult, certificatesResult] = await Promise.all([
      supabase
        .from('order_items')
        .select('order_id, product_name, variant_name, product_type, quantity, unit_price_minor')
        .in('order_id', orderIds)
        .order('created_at')
        .limit(1500),
      supabase
        .from('order_invoices')
        .select('order_id, invoice_no')
        .in('order_id', orderIds)
        .limit(50),
      supabase
        .from('order_certificates')
        .select('order_id, object_path')
        .in('order_id', orderIds)
        .limit(50),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (certificatesResult.error) throw certificatesResult.error;

    let certificateUrlByOrder = new Map<string, string>();
    if (certificatesResult.data.length) {
      const { data, error } = await supabase.storage
        .from('njet-order-certificates')
        .createSignedUrls(
          certificatesResult.data.map((certificate) => certificate.object_path),
          60,
          { download: true }
        );
      if (error) {
        console.error('Could not create private ownership-certificate links.', error);
      } else {
        const signedByPath = new Map(
          data.flatMap((entry) =>
            entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []
          )
        );
        certificateUrlByOrder = new Map(
          certificatesResult.data.flatMap((certificate) => {
            const url = signedByPath.get(certificate.object_path);
            return url ? [[certificate.order_id, url] as const] : [];
          })
        );
      }
    }

    return {
      data: orders.map((order) => ({
        ...order,
        items: itemsResult.data.filter((item) => item.order_id === order.id),
        invoiceNo: invoicesResult.data.find((invoice) => invoice.order_id === order.id)?.invoice_no ?? null,
        certificateUrl: certificateUrlByOrder.get(order.id) ?? null,
      })),
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
