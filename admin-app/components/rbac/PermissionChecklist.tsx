'use client';

import type { Permission, RoleScope } from '@/types/database';
import { cn } from '@/lib/utils';

interface PermissionChecklistProps {
  permissions: Permission[];
  scope: RoleScope;
  value: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}

function baselineKey(scope: RoleScope): string {
  return scope === 'staff' ? 'admin.access' : 'storefront.access';
}

export function PermissionChecklist({
  permissions,
  scope,
  value,
  onChange,
  disabled = false,
}: PermissionChecklistProps) {
  const surface = scope === 'staff' ? 'admin' : 'storefront';
  const baseline = baselineKey(scope);
  const visible = permissions.filter(
    (permission) => permission.surface === surface
  );

  const groups = new Map<string, Permission[]>();
  for (const permission of visible) {
    const group = groups.get(permission.group_name) ?? [];
    group.push(permission);
    groups.set(permission.group_name, group);
  }

  const toggle = (key: string, checked: boolean) => {
    if (key === baseline) return;

    const next = new Set(value);
    next.add(baseline);

    if (checked) {
      next.add(key);
      if (key.endsWith('.manage')) {
        next.add(key.replace(/\.manage$/, '.read'));
      }
    } else {
      next.delete(key);
      if (key.endsWith('.read')) {
        next.delete(key.replace(/\.read$/, '.manage'));
      }
    }

    onChange([...next].sort());
  };

  if (visible.length === 0) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        No permissions are available for this scope yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([group, items]) => (
        <fieldset
          key={group}
          className="rounded-xl border bg-card p-4"
          disabled={disabled}
        >
          <legend className="px-1 text-sm font-semibold">{group}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {items.map((permission) => {
              const isBaseline = permission.key === baseline;
              const checked =
                isBaseline || value.includes(permission.key);

              return (
                <label
                  key={permission.key}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-2 transition-colors',
                    !disabled && !isBaseline && 'hover:bg-muted/60'
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                    checked={checked}
                    disabled={disabled || isBaseline}
                    onChange={(event) =>
                      toggle(permission.key, event.target.checked)
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {permission.name}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {permission.key}
                    </span>
                    {permission.description && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {permission.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
