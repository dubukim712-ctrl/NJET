import { z } from 'zod';
import { ROLE_SLUG_PATTERN } from '@/lib/rbac';

const roleSlugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug is too long')
  .regex(
    ROLE_SLUG_PATTERN,
    'Use lowercase letters, numbers, and underscores only'
  );

const roleNameSchema = z
  .string()
  .min(2, 'Role name must be at least 2 characters')
  .max(60, 'Role name is too long');

const roleDescriptionSchema = z
  .string()
  .max(200, 'Description is too long')
  .optional();

export const roleScopeSchema = z.enum(['staff', 'customer']);

export const permissionKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9_]+(\.[a-z0-9_]+)+$/,
    'Permission keys use dot notation.'
  );

export const permissionKeysSchema = z
  .array(permissionKeySchema)
  .max(100, 'Too many permissions');

export const createRoleSchema = z.object({
  slug: roleSlugSchema,
  name: roleNameSchema,
  description: roleDescriptionSchema,
  scope: roleScopeSchema,
  permissionKeys: permissionKeysSchema,
});

export const updateRoleSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema,
});

export const rolePermissionsSchema = z.object({
  roleId: z.string().uuid('Invalid role.'),
  permissionKeys: permissionKeysSchema,
});

export const roleIdSchema = z.string().uuid('Invalid role.');

export const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user.'),
  roleId: z.string().uuid('Invalid role.'),
});

export const assignUserBranchSchema = z.object({
  userId: z.string().uuid('Invalid user.'),
  branchId: z.string().uuid('Invalid branch.').nullable(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleScopeInput = z.infer<typeof roleScopeSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type AssignUserBranchInput = z.infer<typeof assignUserBranchSchema>;
