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
  branchesRead: 'branches.read',
  branchesManage: 'branches.manage',
  deliveryZonesRead: 'delivery_zones.read',
  deliveryZonesManage: 'delivery_zones.manage',
  ordersRead: 'orders.read',
  ordersManage: 'orders.manage',
  serviceAppointmentsRead: 'service_appointments.read',
  serviceAppointmentsManage: 'service_appointments.manage',
  serviceAppointmentsWork: 'service_appointments.work',
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
  if (isCustomer(profile)) {
    return '/';
  }
  if (hasPermission(profile, PERMISSIONS.storefrontAccess)) {
    return '/dashboard';
  }
  return '/no-access';
}
