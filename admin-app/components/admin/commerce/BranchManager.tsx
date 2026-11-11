'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { MapPin, Pencil, Plus, Store } from 'lucide-react';
import { BranchEditor } from '@/components/admin/commerce/BranchEditor';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

type BranchModal =
  | { type: 'add' }
  | { type: 'view'; branch: Branch }
  | { type: 'edit'; branch: Branch };

const BranchLocationMap = dynamic(
  () => import('@/components/admin/commerce/BranchLocationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-lg border bg-muted sm:h-96" />
    ),
  }
);

export function BranchManager({
  branches,
  canManage,
  canCreateBranch,
}: {
  branches: Branch[];
  canManage: boolean;
  canCreateBranch: boolean;
}) {
  const [modal, setModal] = useState<BranchModal | null>(null);
  const isEditor = modal?.type === 'add' || modal?.type === 'edit';
  const viewHasCoordinates =
    modal?.type === 'view' &&
    modal.branch.latitude !== null &&
    modal.branch.longitude !== null;

  return (
    <div className="space-y-5">
      {canCreateBranch && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setModal({ type: 'add' })}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Add branch
          </Button>
        </div>
      )}

      {branches.length === 0 ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          No branches have been added.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => setModal({ type: 'view', branch })}
              className="group flex min-h-44 flex-col items-start rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex w-full items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Store className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-card-foreground">
                    {branch.name}
                    {branch.is_demo && ' · sample'}
                  </span>
                </span>
              </span>
              <span className="flex w-full flex-1 items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2 break-words">{branch.address}</span>
              </span>
              <span className="pt-4 text-xs text-muted-foreground">
                {branch.active ? 'Active' : 'Inactive'} · /{branch.slug}
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={modal !== null}
        title={
          modal?.type === 'add'
            ? 'Add a branch'
            : modal?.type === 'edit'
              ? 'Edit branch'
              : 'Branch details'
        }
        size={isEditor || viewHasCoordinates ? 'wide' : 'default'}
        onClose={() => setModal(null)}
      >
        {modal?.type === 'add' && canCreateBranch && (
          <BranchEditor
            key="new-branch"
            onCancel={() => setModal(null)}
            onSaved={() => setModal(null)}
          />
        )}
        {modal?.type === 'edit' && (
          <BranchEditor
            key={modal.branch.id}
            branch={modal.branch}
            onCancel={() => setModal(null)}
            onSaved={() => setModal(null)}
          />
        )}
        {modal?.type === 'view' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">{modal.branch.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {modal.branch.active ? 'Active branch' : 'Inactive branch'}
                {modal.branch.is_demo && ' · sample'}
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Address
                </dt>
                <dd className="mt-1 text-sm">{modal.branch.address}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  URL slug
                </dt>
                <dd className="mt-1 text-sm">/{modal.branch.slug}</dd>
              </div>
              {modal.branch.latitude !== null && modal.branch.longitude !== null && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Coordinates
                  </dt>
                  <dd className="mt-1 text-sm">
                    {modal.branch.latitude.toFixed(6)}, {modal.branch.longitude.toFixed(6)}
                  </dd>
                </div>
              )}
            </dl>
            {modal.branch.latitude !== null && modal.branch.longitude !== null ? (
              <BranchLocationMap
                position={[modal.branch.latitude, modal.branch.longitude]}
                interactive={false}
              />
            ) : (
              <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                No map location has been pinned for this branch.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Close
              </Button>
              {canManage && (
                <Button
                  type="button"
                  onClick={() => setModal({ type: 'edit', branch: modal.branch })}
                >
                  <Pencil className="mr-2 size-4" aria-hidden="true" />
                  Edit branch
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
