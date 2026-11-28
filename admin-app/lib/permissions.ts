import { isWithinRoute, normalizeAuthDestination, PROTECTED_CUSTOMER_ROUTES } from '@/lib/customer-routes';
import type { UserProfile } from '@/types/database';

export const PERMISSIONS = {
  adminAccess: 'admin.access',
  usersRead: 'users.read',
  usersManage: 'users.manage',
  rolesRead: 'roles.read',
  rolesManage: 'roles.manage',
  auditLogsRead: 'audit_logs.read',
  storefrontAccess: 'storefront.access',
  productsRead: 'products.read',
  productsManage: 'products.manage',
  productReviewsModerate: 'product_reviews.moderate',
  branchesRead: 'branches.read',
  branchesManage: 'branches.manage',
  deliveryZonesRead: 'delivery_zones.read',
  deliveryZonesManage: 'delivery_zones.manage',
  crmRead: 'crm.read',
  crmManage: 'crm.manage',
  ordersRead: 'orders.read',
  ordersManage: 'orders.manage',
  serviceAppointmentsRead: 'service_appointments.read',
  serviceAppointmentsManage: 'service_appointments.manage',
  serviceAppointmentsWork: 'service_appointments.work',
  supportChatManage: 'support.chat.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type PermissionProfile = Pick<UserProfile, 'permissions'> | null | undefined;

export function hasPermission(
  profile: PermissionProfile,
  permission: string
): boolean {
  return profile?.permissions?.includes(permission) ?? false;
}

export function isStaff(
  profile: Pick<UserProfile, 'scope' | 'permissions'> | null | undefined
): boolean {
  return (
    profile?.scope === 'staff' &&
    hasPermission(profile, PERMISSIONS.adminAccess)
  );
}

export function isCustomer(
  profile: Pick<UserProfile, 'scope' | 'permissions'> | null | undefined
): boolean {
  return (
    profile?.scope === 'customer' &&
    hasPermission(profile, PERMISSIONS.storefrontAccess)
  );
}

export function canPreviewStorefront(profile: PermissionProfile): boolean {
  return hasPermission(profile, PERMISSIONS.storefrontAccess);
}

export function surfaceHome(
  profile: Pick<UserProfile, 'scope' | 'permissions'> | null | undefined
): string {
  if (hasPermission(profile, PERMISSIONS.adminAccess)) {
    return '/admin';
  }
  if (hasPermission(profile, PERMISSIONS.storefrontAccess)) {
    return '/';
  }
  return '/no-access';
}

export function signInDestination(
  profile: Parameters<typeof surfaceHome>[0],
  requested: unknown,
) {
  const home = surfaceHome(profile);
  const destination = normalizeAuthDestination(requested);
  if (!destination) return home;

  const pathname = destination.split(/[?#]/, 1)[0];
  if (home === '/admin' && isWithinRoute(pathname, '/admin')) return destination;

  const isCustomerDestination = pathname === '/' ||
    PROTECTED_CUSTOMER_ROUTES.some((route) => isWithinRoute(pathname, route));
  if (isCustomerDestination && hasPermission(profile, PERMISSIONS.storefrontAccess)) return destination;

  return home;
}
