export type RoleScope = 'staff' | 'customer';
export type PermissionSurface = 'admin' | 'storefront';

export type Permission = {
  key: string;
  name: string;
  description: string | null;
  group_name: string;
  surface: PermissionSurface;
  sort_order: number;
  created_at: string;
};

export type Role = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  scope: RoleScope;
  is_full_access: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type RolePermission = {
  id: string;
  role_id: string;
  permission_key: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role_id: string;
  branch_id: string | null;
  branch_name: string | null;
  role: string;
  role_name: string;
  scope: RoleScope;
  is_full_access: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
};
