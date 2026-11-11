'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@/types/database';
import { updateRoleAction } from '@/data/actions/roles';
import {
  updateRoleSchema,
  type UpdateRoleInput,
} from '@/lib/validations/rbac';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EditRoleFormProps {
  role: Role;
}

export function EditRoleForm({ role }: EditRoleFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateRoleInput>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      name: role.name,
      description: role.description ?? '',
    },
  });

  const applyFieldErrors = (
    fieldErrors: Record<string, string[] | undefined> | undefined
  ) => {
    if (!fieldErrors) return;

    for (const [key, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        setError(key as keyof UpdateRoleInput, { message: messages[0] });
      }
    }
  };

  const onSubmit = async (data: UpdateRoleInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.set('name', data.name);
    formData.set('description', data.description ?? '');

    try {
      const result = await updateRoleAction(role.id, formData);

      if (result.success) {
        toast.success('Role updated.');
        router.refresh();
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
      className="space-y-5 rounded-xl border bg-card p-5"
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold">Role details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The slug is permanent. Update the display name and description here.
        </p>
      </div>

      <Input
        id="name"
        label="Role name"
        type="text"
        leadingIcon={<Tag className="h-4 w-4" />}
        error={errors.name?.message}
        disabled={isSubmitting}
        {...register('name')}
      />

      <div className="space-y-2">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug
        </label>
        <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
          {role.slug}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
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

      {serverError && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Save details
        </Button>
      </div>
    </form>
  );
}
