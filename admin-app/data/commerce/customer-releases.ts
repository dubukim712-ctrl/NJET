import { getAuthContext } from '@/data/auth/guards';
import { createClient } from '@/data/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { releasesBucket, type ReleaseOrderOption } from '@/lib/customer-releases';

export async function getReleaseStaffContext() {
  const context = await getAuthContext();
  const profile = context?.profile;
  if (!context || !profile || profile.scope !== 'staff'
    || !hasPermission(profile, PERMISSIONS.adminAccess)
    || (!profile.is_full_access && !hasPermission(profile, PERMISSIONS.ordersRead))) return null;
  return { ...context, canApprove: profile.is_full_access };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function getManageableReleases(client: Supabase, canApprove: boolean, userId: string) {
  let query = client.from('customer_releases').select('*');
  if (!canApprove) query = query.eq('uploaded_by', userId);
  const { data, error } = await query.order('is_approved').order('display_order')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((release) => ({
    ...release, photoUrl: client.storage.from(releasesBucket).getPublicUrl(release.image_path).data.publicUrl,
  }));
}

function shortName(value: string) {
  const [first, ...rest] = value.trim().split(/\s+/);
  return rest.length ? `${first} ${Array.from(rest.at(-1) ?? '')[0]}.` : first;
}

export async function getLinkedReleaseOrderIds(client: Supabase, orderIds: string[], excludeReleaseId?: string) {
  if (!orderIds.length) return [];
  const { data, error } = await client.rpc('linked_customer_release_orders', {
    p_order_ids: orderIds,
    p_exclude_release_id: excludeReleaseId,
  });
  if (error) throw error;
  return (data ?? []).map(({ order_id }) => order_id);
}

export async function getReleaseOrderChoices(client: Supabase) {
  const orders = await getReleaseOrderOptions(client);
  const linkedOrderIds = await getLinkedReleaseOrderIds(client, [...new Set(orders.map(({ orderId }) => orderId))]);
  return { orders, linkedOrderIds };
}

async function getReleaseOrderOptions(client: Supabase): Promise<ReleaseOrderOption[]> {
  const { data: orders, error } = await client.from('orders')
    .select('id, order_number, customer_name, branch_id, branch_name')
    .eq('status', 'completed').order('completed_at', { ascending: false, nullsFirst: false }).limit(30);
  if (error) throw error;
  if (!orders?.length) return [];

  const { data: items, error: itemsError } = await client.from('order_items')
    .select('id, order_id, variant_id, product_name').in('order_id', orders.map(({ id }) => id))
    .eq('product_type', 'ebike');
  if (itemsError) throw itemsError;
  const variants = (items?.length && await client.from('product_variants').select('id, product_id')
    .in('id', [...new Set(items.map(({ variant_id }) => variant_id))])) || null;
  const products = new Map(variants?.data?.map((variant) => [variant.id, variant.product_id]));

  return orders.flatMap((order) => {
    const byModel = new Map<string, ReleaseOrderOption>();
    for (const item of items ?? []) {
      if (item.order_id !== order.id || byModel.has(item.product_name)) continue;
      byModel.set(item.product_name, {
        key: item.id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: shortName(order.customer_name),
        productId: products.get(item.variant_id) ?? null,
        modelName: item.product_name,
        branchId: order.branch_id,
        branchName: order.branch_name,
      });
    }
    if (byModel.size) return [...byModel.values()];
    return [{
      key: order.id, orderId: order.id, orderNumber: order.order_number,
      customerName: shortName(order.customer_name), productId: null, modelName: '',
      branchId: order.branch_id, branchName: order.branch_name,
    }];
  });
}

export async function getPublishedCustomerReleases() {
  try {
    const client = await createClient();
    const { data, error } = await client.from('customer_releases')
      .select('id, image_path, customer_name, model_name, branch_name, caption')
      .eq('is_approved', true).order('display_order').order('created_at', { ascending: false })
      .order('id').limit(6);
    if (error) throw error;
    return (data ?? []).map(({ image_path, ...release }) => ({
      ...release, photoUrl: client.storage.from(releasesBucket).getPublicUrl(image_path).data.publicUrl,
    }));
  } catch (error) {
    console.error('Could not load the customer release gallery.', error);
    return [];
  }
}

export async function releaseOrderReferences(client: Supabase, ids: string[]) {
  if (!ids.length) return {};
  const { data } = await client.from('orders').select('id, order_number').in('id', ids);
  return Object.fromEntries((data ?? []).map(({ id, order_number }) => [id, order_number]));
}
