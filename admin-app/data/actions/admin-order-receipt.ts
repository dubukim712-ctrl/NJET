'use server';

import { requirePermission, requireStaff } from '@/data/auth/guards';
import { getPrintableReceipt } from '@/data/commerce/printable-receipt';
import { PERMISSIONS } from '@/lib/permissions';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export async function getAdminOrderReceipt(userId: string, orderId: string) {
  await requireStaff('/admin/orders');
  const { supabase, profile, user } = await requirePermission(PERMISSIONS.ordersRead, '/admin/orders');
  if (user.id !== userId || !customerOrderIdSchema.safeParse(orderId).success) return null;
  const branchLocked = profile.scope === 'staff' && !profile.is_full_access;
  if (branchLocked && !profile.branch_id) return null;
  return getPrintableReceipt(supabase, orderId, { branchId: branchLocked ? profile.branch_id : null });
}
