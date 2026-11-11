import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';
import type { OrderFilters } from '@/lib/validations/order-filters';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type OrderDocumentRow = Database['public']['Tables']['order_documents']['Row'];

export type StaffOrder = Pick<
  OrderRow,
  | 'id' | 'order_number' | 'customer_name' | 'contact_number' | 'fulfillment'
  | 'order_source' | 'cash_tendered_minor'
  | 'branch_name' | 'delivery_zone_name' | 'address_line1' | 'barangay'
  | 'city' | 'province' | 'postal_code' | 'payment_method' | 'payment_provider'
  | 'payment_recipient_id'
  | 'payment_reference' | 'status' | 'total_minor' | 'delivery_fee_minor'
  | 'reservation_due_minor' | 'balance_due_minor' | 'online_due_minor'
  | 'home_credit_downpayment_due_minor' | 'created_at'
> & {
  paymentRecipientName: string | null;
  items: Pick<
    OrderItemRow,
    | 'id' | 'order_id' | 'product_name' | 'product_type' | 'variant_name'
    | 'sku' | 'quantity' | 'unit_price_minor'
  >[];
  homeCreditDetails: {
    accountNo: string;
    downpaymentMinor: number;
    termsMonths: number;
    monthlyPaymentMinor: number;
  } | null;
  documents: (Omit<
    Pick<OrderDocumentRow, 'id' | 'order_id' | 'kind' | 'content_type' | 'file_size' | 'created_at'>,
    'object_path'
  > & { url: string | null })[];
  invoiceNo: string | null;
  certificate: { url: string | null } | null;
};

export type OrderBranchOption = Pick<
  Database['public']['Tables']['branches']['Row'],
  'id' | 'name'
>;

export async function getCommerceOrders(
  supabase: SupabaseClient,
  filters: OrderFilters,
  canManage: boolean
): Promise<{
  data: StaffOrder[] | null;
  branches: OrderBranchOption[];
  error: string | null;
}> {
  try {
    let orderQuery = supabase
      .from('orders')
      .select(`
        id, order_number, customer_name, contact_number, fulfillment, order_source,
        cash_tendered_minor, branch_id, branch_name,
        delivery_zone_name, address_line1, barangay, city, province, postal_code,
        payment_method, payment_provider, payment_recipient_id, payment_reference, status, total_minor,
        delivery_fee_minor, reservation_due_minor, balance_due_minor, online_due_minor,
        home_credit_downpayment_due_minor,
        created_at
      `);
    const searchTerm = filters.q.replace(/[%,()]/g, ' ').trim();
    if (searchTerm) {
      orderQuery = orderQuery.or(
        `order_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%`
      );
    }
    if (filters.status) orderQuery = orderQuery.eq('status', filters.status);
    if (filters.branch) orderQuery = orderQuery.eq('branch_id', filters.branch);

    const [orderResult, branchResult] = await Promise.all([
      orderQuery.order('created_at', { ascending: false }).limit(50),
      supabase.from('branches').select('id, name').order('name').limit(200),
    ]);
    if (orderResult.error) throw orderResult.error;
    if (branchResult.error) throw branchResult.error;

    let branches = branchResult.data.map(({ id, name }) => ({ id, name }));
    if (!branches.length) {
      // shortcut: fallback options cover the newest 500 visible orders; use a scoped branch-options query if needed.
      const { data: visibleOrders, error } = await supabase
        .from('orders')
        .select('branch_id, branch_name')
        .not('branch_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      branches = [...new Map(
        visibleOrders.flatMap(({ branch_id, branch_name }) =>
          branch_id ? [[branch_id, { id: branch_id, name: branch_name }]] : []
        )
      ).values()].sort((first, second) => first.name.localeCompare(second.name));
    }

    const orders = orderResult.data;
    if (!orders.length) return { data: [], branches, error: null };

    const orderIds = orders.map((order) => order.id);
    const homeCreditDetailsQuery = canManage
      ? supabase
          .from('order_home_credit_details')
          .select('order_id, home_credit_acc_no, downpayment_minor, terms_months, monthly_payment_minor')
          .in('order_id', orderIds)
          .limit(50)
      : Promise.resolve({ data: [], error: null });
    const [itemsResult, documentsResult, invoicesResult, certificatesResult, homeCreditDetailsResult] =
      await Promise.all([
        supabase
          .from('order_items')
          .select('id, order_id, product_name, product_type, variant_name, sku, quantity, unit_price_minor')
          .in('order_id', orderIds)
          .order('created_at')
          .limit(1500),
        supabase
          .from('order_documents')
          .select('id, order_id, kind, object_path, content_type, file_size, created_at')
          .in('order_id', orderIds)
          .order('created_at')
          .limit(300),
        supabase
          .from('order_invoices')
          .select('id, order_id, invoice_no, created_at, updated_at')
          .in('order_id', orderIds)
          .limit(50),
        supabase
          .from('order_certificates')
          .select('id, order_id, object_path')
          .in('order_id', orderIds)
          .limit(50),
        homeCreditDetailsQuery,
      ]);
    if (itemsResult.error) throw itemsResult.error;
    if (documentsResult.error) throw documentsResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (certificatesResult.error) throw certificatesResult.error;
    if (homeCreditDetailsResult.error) throw homeCreditDetailsResult.error;

    const recipientIds = [...new Set(
      orders.map((order) => order.payment_recipient_id).filter(
        (id): id is string => Boolean(id)
      )
    )];
    const recipientNameById = new Map<string, string>();
    const homeCreditDetailsByOrderId = new Map(
      homeCreditDetailsResult.data.map((details) => [details.order_id, details])
    );
    if (recipientIds.length) {
      const { data: recipients, error: recipientError } = await supabase
        .from('payment_recipients')
        .select('id, recipient_name')
        .in('id', recipientIds)
        .limit(50);
      if (recipientError) throw recipientError;
      for (const recipient of recipients) {
        recipientNameById.set(recipient.id, recipient.recipient_name);
      }
    }

    let signedByPath = new Map<string, string>();
    if (documentsResult.data.length) {
      const { data, error } = await supabase.storage
        .from('njet-order-documents')
        .createSignedUrls(
          documentsResult.data.map((document) => document.object_path),
          60,
          { download: true }
        );
      if (error) {
        console.error('Could not create private order-document links.', error);
      } else {
        signedByPath = new Map(
          data.flatMap((entry) =>
            entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []
          )
        );
      }
    }
    let certificateUrlByPath = new Map<string, string>();
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
        certificateUrlByPath = new Map(
          data.flatMap((entry) =>
            entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []
          )
        );
      }
    }

    return {
      data: orders.map((order) => ({
        ...order,
        paymentRecipientName: order.payment_recipient_id
          ? recipientNameById.get(order.payment_recipient_id) ?? null
          : null,
        items: itemsResult.data.filter((item) => item.order_id === order.id),
        invoiceNo: invoicesResult.data.find((invoice) => invoice.order_id === order.id)?.invoice_no ?? null,
        homeCreditDetails: (() => {
          const details = homeCreditDetailsByOrderId.get(order.id);
          return details
            ? {
                accountNo: details.home_credit_acc_no,
                downpaymentMinor: details.downpayment_minor,
                termsMonths: details.terms_months,
                monthlyPaymentMinor: details.monthly_payment_minor,
              }
            : null;
        })(),
        documents: documentsResult.data
          .filter((document) => document.order_id === order.id)
          .map(({ object_path, ...document }) => ({
            ...document,
            url: signedByPath.get(object_path) ?? null,
          })),
        certificate: (() => {
          const certificate = certificatesResult.data.find(
            (entry) => entry.order_id === order.id
          );
          return certificate
            ? { url: certificateUrlByPath.get(certificate.object_path) ?? null }
            : null;
        })(),
      })),
      branches,
      error: null,
    };
  } catch (error) {
    console.error('Could not load commerce orders.', error);
    return {
      data: null,
      branches: [],
      error: 'Orders could not be loaded. Please try again later.',
    };
  }
}
