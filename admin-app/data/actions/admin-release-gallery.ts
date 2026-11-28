'use server';

import { getManageableReleases, getReleaseOrderChoices, getReleaseStaffContext, releaseOrderReferences } from '@/data/commerce/customer-releases';

export async function getAdminReleaseGallery(userId: string) {
  const context = await getReleaseStaffContext();
  if (!context || context.user.id !== userId) throw new Error('Release gallery access is unavailable.');
  const [releases, orders] = await Promise.allSettled([
    getManageableReleases(context.supabase, context.canApprove, context.user.id),
    getReleaseOrderChoices(context.supabase),
  ]);
  if (releases.status === 'rejected') {
    throw new Error('Customer releases are temporarily unavailable.');
  }

  const options = orders.status === 'fulfilled' ? orders.value : { orders: [], linkedOrderIds: [] };
  const orderNumbers = await releaseOrderReferences(context.supabase, [...new Set(releases.value.flatMap(
    ({ order_id }) => order_id ? [order_id] : [],
  ))]).catch(() => ({}));
  return {
    items: releases.value,
    ...options,
    orderNumbers,
    ordersUnavailable: orders.status === 'rejected',
  };
}
