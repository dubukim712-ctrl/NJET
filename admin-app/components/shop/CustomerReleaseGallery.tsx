'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type ReleasePhoto = {
  id: string;
  photoUrl: string;
  customer_name: string | null;
  model_name: string | null;
  branch_name: string | null;
  caption: string | null;
};

function ReleaseDetails({ release }: { release: ReleasePhoto }) {
  return (
    <div className="min-w-0 space-y-2 break-words">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {release.model_name && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{release.model_name}</span>}
        {release.branch_name && <span className="text-muted-foreground">{release.branch_name}</span>}
      </div>
      {release.customer_name && <p className="text-sm font-semibold">{release.customer_name}</p>}
      {release.caption && <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">{release.caption}</p>}
    </div>
  );
}

export function CustomerReleaseGallery({ releases }: { releases: ReleasePhoto[] }) {
  const [selected, setSelected] = useState<ReleasePhoto | null>(null);
  if (!releases.length) return null;

  return (
    <section aria-labelledby="customer-release-title" className="min-w-0 lg:col-span-7">
      <h3 id="customer-release-title" className="mb-4 text-xl font-semibold">Customer Releases Gallery</h3>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 md:grid md:grid-cols-3 md:overflow-visible">
        {releases.map((release, index) => (
          <li key={release.id} className={`relative w-[78%] min-w-0 shrink-0 snap-start overflow-hidden rounded-xl border bg-card text-card-foreground hover:border-primary focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary md:w-auto ${index === 0 ? "md:col-span-3" : ""}`}>
            <div className={`relative aspect-[4/3] bg-muted ${index === 0 ? "md:aspect-video" : ""}`}>
              <Image src={release.photoUrl} alt={release.model_name ?? 'Customer release photo'} fill sizes={index === 0 ? "(min-width: 1024px) 58vw, (min-width: 768px) 100vw, 78vw" : "(min-width: 1024px) 19vw, (min-width: 768px) 33vw, 78vw"} className="object-cover" />
            </div>
            <div className="p-4"><ReleaseDetails release={release} /></div>
            <Button type="button" variant={null} size={null} className="absolute inset-0 rounded-xl focus-visible:ring-inset"
              onClick={() => setSelected(release)} aria-label={`Preview ${release.model_name ?? 'customer release'} photo`} />
          </li>
        ))}
      </ul>
      <Modal open={Boolean(selected)} title={selected?.model_name ?? 'Customer release photo'} size="wide" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <div className="relative h-[min(55dvh,32rem)] overflow-hidden rounded-lg bg-muted">
              <Image src={selected.photoUrl} alt={selected.model_name ?? 'Customer release photo'} fill
                sizes="(min-width: 768px) 768px, 95vw" className="object-contain" />
            </div>
            <div className="[&_p]:line-clamp-none"><ReleaseDetails release={selected} /></div>
          </div>
        )}
      </Modal>
    </section>
  );
}
