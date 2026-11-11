import type { RoleScope } from '@/types/database';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const ROLE_SLUG_PATTERN = /^[a-z0-9_]+$/;
export const MAX_SEARCH_LENGTH = 100;

type RoleLike = {
  id: string;
  slug: string;
  name: string;
  scope: RoleScope;
  is_full_access: boolean;
  is_system: boolean;
  permissions: string[];
};

type UserLike = {
  id: string;
  scope: RoleScope;
  is_full_access: boolean;
  permissions: string[];
};

type ActorLike = UserLike & {
  is_full_access: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
});

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function formatRbacDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

export function normalizeSearch(value?: string): string | undefined {
  const term = value?.trim().slice(0, MAX_SEARCH_LENGTH);
  return term ? term : undefined;
}

export function parseRoleFilter(value?: string): string | undefined {
  return value && isValidUuid(value) ? value : undefined;
}

export function roleScopeLabel(scope: RoleScope): string {
  return scope === 'customer' ? 'Customer' : 'Staff';
}

function isSubset(keys: string[], allowed: string[]): boolean {
  return keys.every((key) => allowed.includes(key));
}

export function roleAssignmentBlockedReason(
  actor: ActorLike | null,
  target: UserLike,
  role?: RoleLike
): string | null {
  if (!actor || !hasPermission(actor, PERMISSIONS.usersManage)) {
    return 'You do not have permission to manage users.';
  }

  if (actor.id === target.id) {
    return 'You cannot change your own role.';
  }

  if (actor.is_full_access) {
    return null;
  }

  if (target.is_full_access) {
    return "Only full-access admins can change a full-access user's role.";
  }

  if (target.scope !== actor.scope) {
    return 'You cannot manage users outside your own surface.';
  }

  if (!isSubset(target.permissions, actor.permissions)) {
    return 'You cannot change a user whose role has permissions you do not have.';
  }

  if (role) {
    if (role.is_full_access) {
      return 'Only full-access admins can assign a full-access role.';
    }

    if (role.scope !== target.scope) {
      return 'You cannot move a user between staff and customer roles.';
    }

    if (!isSubset(role.permissions, actor.permissions)) {
      return 'You cannot assign a role with permissions you do not have.';
    }
  }

  return null;
}

export function canAssignRole(
  actor: ActorLike | null,
  target: UserLike,
  role: RoleLike
): boolean {
  return roleAssignmentBlockedReason(actor, target, role) === null;
}

export function getAssignableRoles<T extends RoleLike>(
  actor: ActorLike | null,
  target: UserLike,
  roles: T[]
): T[] {
  return roles.filter((role) => canAssignRole(actor, target, role));
}

export function canManagePermissions(
  actor: ActorLike | null,
  role: RoleLike
): boolean {
  if (!actor || !hasPermission(actor, PERMISSIONS.rolesManage)) {
    return false;
  }

  if (role.is_full_access) {
    return false;
  }

  if (actor.is_full_access) {
    return true;
  }

  return (
    role.scope === actor.scope && isSubset(role.permissions, actor.permissions)
  );
}

export function buildUsersHref({
  page = 1,
  search,
  roleId,
}: {
  page?: number;
  search?: string;
  roleId?: string;
}): string {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (roleId) params.set('role', roleId);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return `/admin/users${query ? `?${query}` : ''}`;
}
