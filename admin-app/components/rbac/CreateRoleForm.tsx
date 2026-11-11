'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Hash, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { Permission, RoleScope } from '@/types/database';
import { createRoleAction } from '@/data/actions/roles';
import { useInvalidateAdminRolesQuery } from '@/data/rbac/admin-roles-client';
import { useInvalidateAdminUsersQuery } from '@/data/rbac/admin-users-client';
import {
  createRoleSchema,
  type CreateRoleInput,
} from '@/lib/validations/rbac';
import { PermissionChecklist } from '@/components/rbac/PermissionChecklist';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface CreateRoleFormProps {
  permissions: Permission[];
}

const SCOPE_BASELINE: Record<RoleScope, string> = {
  staff: 'admin.access',
  customer: 'storefront.access',
};

export function CreateRoleForm({ permissions }: CreateRoleFormProps) {
  const router = useRouter();
  const invalidateRoles = useInvalidateAdminRolesQuery();
  const invalidateUsers = useInvalidateAdminUsersQuery();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
      scope: 'staff',
      permissionKeys: [SCOPE_BASELINE.staff],
    },
  });

  const scope = useWatch({ control, name: 'scope' });
  const permissionKeys = useWatch({ control, name: 'permissionKeys' });

  const applyFieldErrors = (
    fieldErrors: Record<string, string[] | undefined> | undefined
  ) => {
    if (!fieldErrors) return;

    for (const [key, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        setError(key as keyof CreateRoleInput, { message: messages[0] });
      }
    }
  };

  const changeScope = (nextScope: RoleScope) => {
    setValue('scope', nextScope);
    setValue('permissionKeys', [SCOPE_BASELINE[nextScope]]);
  };

  const onSubmit = async (data: CreateRoleInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.set('slug', data.slug);
    formData.set('name', data.name);
    formData.set('description', data.description ?? '');
    formData.set('scope', data.scope);
    data.permissionKeys.forEach((key) => formData.append('permissions', key));

    try {
      const result = await createRoleAction(formData);

      if (result.success) {
        await Promise.all([invalidateRoles(), invalidateUsers()]);
        toast.success('Role created.');
        router.push(`/admin/roles/${result.data.id}`);
        return;
      }

      setServerError(result.error);
      applyFieldErrors(result.fieldErrors);
      toast.error(result.error);
    } catch {
      const message = 'Something went wrong. Please try again.';
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="name"
          label="Role name"
          type="text"
          placeholder="Warehouse lead"
          leadingIcon={<Tag className="h-4 w-4" />}
          error={errors.name?.message}
          disabled={isSubmitting}
          {...register('name')}
        />

        <Input
          id="slug"
          label="Slug"
          type="text"
          placeholder="warehouse_lead"
          autoComplete="off"
          leadingIcon={<Hash className="h-4 w-4" />}
          helperText="Lowercase letters, numbers, and underscores. The slug cannot be changed later."
          error={errors.slug?.message}
          disabled={isSubmitting}
          {...register('slug')}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          placeholder="What can people with this role do?"
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Select
          id="scope"
          label="Surface"
          value={scope}
          disabled={isSubmitting}
          onChange={(event) => changeScope(event.target.value as RoleScope)}
          helperText="Staff roles can use the admin panel. Customer roles can only use the storefront."
          containerClassName="sm:max-w-xs"
        >
          <option value="staff">Staff — admin panel</option>
          <option value="customer">Customer — storefront</option>
        </Select>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Permissions</h2>
        <PermissionChecklist
          permissions={permissions}
          scope={scope}
          value={permissionKeys}
          onChange={(keys) =>
            setValue('permissionKeys', keys, { shouldValidate: true })
          }
          disabled={isSubmitting}
        />
      </div>

      {serverError && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/admin/roles"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Cancel
        </Link>
        <Button type="submit" loading={isSubmitting}>
          Create role
        </Button>
      </div>
    </form>
  );
}
