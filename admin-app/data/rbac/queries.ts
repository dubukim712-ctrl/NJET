import { createClient } from '@/data/supabase/server';
import type { Permission, Role, UserProfile } from '@/types/database';

export const USERS_PAGE_SIZE = 20;

export type RbacQueryError = 'unknown' | null;

export interface RoleWithUsage extends Role {
  userCount: number;
  permissions: string[];
}

export interface RoleOption {
  id: string;
  slug: string;
  name: string;
  scope: Role['scope'];
  is_full_access: boolean;
  is_system: boolean;
  permissions: string[];
}

export interface RoleListResult {
  roles: RoleWithUsage[];
  error: RbacQueryError;
}

export interface RoleDetailResult {
  role: Role | null;
  permissions: string[];
  userCount: number;
  error: RbacQueryError;
}

export interface PermissionListResult {
  permissions: Permission[];
  error: RbacQueryError;
}

export interface UserListQuery {
  search?: string;
  roleId?: string;
  page?: number;
  pageSize?: number;
}

export interface UserListResult {
  users: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  error: RbacQueryError;
}

type RolePermissionRow = { role_id: string; permission_key: string };

function permissionMap(
  rows: RolePermissionRow[] | null
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const keys = map.get(row.role_id) ?? [];
    keys.push(row.permission_key);
    map.set(row.role_id, keys);
  }
  return map;
}

function keysForRole(
  role: Pick<Role, 'id' | 'is_full_access'>,
  map: Map<string, string[]>,
  catalog: string[]
): string[] {
  return role.is_full_access
    ? catalog
    : [...(map.get(role.id) ?? [])].sort();
}

export async function getPermissions(): Promise<PermissionListResult> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to load permissions:', error.message);
      return { permissions: [], error: 'unknown' };
    }

    return { permissions: data ?? [], error: null };
  } catch (error) {
    console.error('Failed to load permissions:', error);
    return { permissions: [], error: 'unknown' };
  }
}

export async function getRoles(): Promise<RoleListResult> {
  const supabase = await createClient();

  try {
    const [rolesResult, permissionRows, catalog] = await Promise.all([
      supabase
        .from('roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true }),
      supabase.from('role_permissions').select('role_id, permission_key'),
      supabase.from('permissions').select('key').order('sort_order'),
    ]);

    if (rolesResult.error) {
      console.error('Failed to load roles:', rolesResult.error.message);
      return { roles: [], error: 'unknown' };
    }

    if (permissionRows.error) {
      console.error(
        'Failed to load role permissions:',
        permissionRows.error.message
      );
    }

    const map = permissionMap(permissionRows.data);
    const catalogKeys = (catalog.data ?? []).map((row) => row.key);

    const usage = await Promise.all(
      (rolesResult.data ?? []).map(async (role) => {
        const { count, error } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role_id', role.id);

        if (error) {
          console.error('Failed to count role usage:', error.message);
        }

        return [role.id, count ?? 0] as const;
      })
    );

    const counts = new Map(usage);

    return {
      roles: (rolesResult.data ?? []).map((role) => ({
        ...role,
        userCount: counts.get(role.id) ?? 0,
        permissions: keysForRole(role, map, catalogKeys),
      })),
      error: null,
    };
  } catch (error) {
    console.error('Failed to load roles:', error);
    return { roles: [], error: 'unknown' };
  }
}

export async function getRoleOptions(): Promise<{
  roles: RoleOption[];
  error: RbacQueryError;
}> {
  const supabase = await createClient();

  try {
    const [rolesResult, permissionRows, catalog] = await Promise.all([
      supabase
        .from('roles')
        .select('id, slug, name, scope, is_full_access, is_system')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true }),
      supabase.from('role_permissions').select('role_id, permission_key'),
      supabase.from('permissions').select('key').order('sort_order'),
    ]);

    if (rolesResult.error) {
      console.error('Failed to load role options:', rolesResult.error.message);
      return { roles: [], error: 'unknown' };
    }

    const map = permissionMap(permissionRows.data);
    const catalogKeys = (catalog.data ?? []).map((row) => row.key);

    return {
      roles: (rolesResult.data ?? []).map((role) => ({
        ...role,
        permissions: keysForRole(role, map, catalogKeys),
      })),
      error: null,
    };
  } catch (error) {
    console.error('Failed to load role options:', error);
    return { roles: [], error: 'unknown' };
  }
}

export async function getRole(id: string): Promise<RoleDetailResult> {
  const supabase = await createClient();

  try {
    const [roleResult, countResult, permissionRows, catalog] =
      await Promise.all([
        supabase.from('roles').select('*').eq('id', id).single(),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role_id', id),
        supabase
          .from('role_permissions')
          .select('role_id, permission_key')
          .eq('role_id', id),
        supabase.from('permissions').select('key').order('sort_order'),
      ]);

    if (roleResult.error) {
      if (roleResult.error.code === 'PGRST116') {
        return { role: null, permissions: [], userCount: 0, error: null };
      }
      console.error('Failed to load role:', roleResult.error.message);
      return { role: null, permissions: [], userCount: 0, error: 'unknown' };
    }

    const role = roleResult.data;
    const catalogKeys = (catalog.data ?? []).map((row) => row.key);
    const map = permissionMap(permissionRows.data);

    return {
      role,
      permissions: keysForRole(role, map, catalogKeys),
      userCount: countResult.count ?? 0,
      error: null,
    };
  } catch (error) {
    console.error('Failed to load role:', error);
    return { role: null, permissions: [], userCount: 0, error: 'unknown' };
  }
}

export async function getUsers({
  search,
  roleId,
  page = 1,
  pageSize = USERS_PAGE_SIZE,
}: UserListQuery = {}): Promise<UserListResult> {
  const supabase = await createClient();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      // Commas and parentheses are PostgREST filter syntax; strip them so the
      // search term cannot alter the query structure.
      const term = search.replace(/[%,()]/g, ' ').trim();
      if (term) {
        query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
      }
    }

    if (roleId) {
      query = query.eq('role_id', roleId);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Failed to load users:', error.message);
      return {
        users: [],
        total: 0,
        page: safePage,
        pageSize,
        error: 'unknown',
      };
    }

    return {
      users: data ?? [],
      total: count ?? 0,
      page: safePage,
      pageSize,
      error: null,
    };
  } catch (error) {
    console.error('Failed to load users:', error);
    return {
      users: [],
      total: 0,
      page: safePage,
      pageSize,
      error: 'unknown',
    };
  }
}
