'use client';

import { useState } from 'react';
import { MapPinned, Pencil, PhilippinePeso, Plus } from 'lucide-react';
import { DeliveryZoneEditor } from '@/components/admin/commerce/DeliveryZoneEditor';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatPhp } from '@/lib/commerce';
import type { Database } from '@/types/database';

type Zone = Database['public']['Tables']['delivery_zones']['Row'];

type ZoneModal =
  | { type: 'add' }
  | { type: 'view'; zone: Zone }
  | { type: 'edit'; zone: Zone };

export function DeliveryZoneManager({
  zones,
  canManage,
}: {
  zones: Zone[];
  canManage: boolean;
}) {
  const [modal, setModal] = useState<ZoneModal | null>(null);

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setModal({ type: 'add' })}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Add delivery zone
          </Button>
        </div>
      )}

      {zones.length === 0 ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          No delivery zones have been added.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setModal({ type: 'view', zone })}
              className="group flex min-h-44 flex-col items-start rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex w-full items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <MapPinned className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 font-semibold text-card-foreground">
                  {zone.name}
                  {zone.is_demo && ' · sample'}
                </span>
              </span>
              <span className="flex w-full flex-1 items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                <PhilippinePeso className="size-4 shrink-0" aria-hidden="true" />
                {formatPhp(zone.fee_minor)}
              </span>
              <span className="pt-4 text-xs text-muted-foreground">
                {zone.active ? 'Active' : 'Inactive'} · {zone.active ? 'Available at checkout' : 'Not available at checkout'}
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={modal !== null}
        title={
          modal?.type === 'add'
            ? 'Add a delivery zone'
            : modal?.type === 'edit'
              ? 'Edit delivery zone'
              : 'Delivery zone details'
        }
        onClose={() => setModal(null)}
      >
        {modal?.type === 'add' && (
          <DeliveryZoneEditor
            key="new-delivery-zone"
            onCancel={() => setModal(null)}
            onSaved={() => setModal(null)}
          />
        )}
        {modal?.type === 'edit' && (
          <DeliveryZoneEditor
            key={modal.zone.id}
            zone={modal.zone}
            onCancel={() => setModal(null)}
            onSaved={() => setModal(null)}
          />
        )}
        {modal?.type === 'view' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">{modal.zone.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {modal.zone.active ? 'Active at checkout' : 'Inactive at checkout'}
                {modal.zone.is_demo && ' · sample'}
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Delivery fee
                </dt>
                <dd className="mt-1 text-sm">{formatPhp(modal.zone.fee_minor)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Checkout availability
                </dt>
                <dd className="mt-1 text-sm">
                  {modal.zone.active ? 'Available' : 'Unavailable'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Close
              </Button>
              {canManage && (
                <Button
                  type="button"
                  onClick={() => setModal({ type: 'edit', zone: modal.zone })}
                >
                  <Pencil className="mr-2 size-4" aria-hidden="true" />
                  Edit zone
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
