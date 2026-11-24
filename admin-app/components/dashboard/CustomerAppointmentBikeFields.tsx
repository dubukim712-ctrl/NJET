'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';
import { Input } from '@/components/ui/Input';
import type { Database } from '@/types/database';

type RecentBike = Database['public']['Functions']['customer_recent_service_bikes']['Returns'][number];

export function CustomerAppointmentBikeFields({ previousBikes, errors }: {
  previousBikes: RecentBike[];
  errors: Record<string, string[] | undefined>;
}) {
  const [bike, setBike] = useState({ name: '', serial: '' });

  return (
    <>
      {previousBikes.length > 0 && (
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium">Use a purchased or previously serviced bike</p>
          <div className="flex flex-wrap gap-2">
            {previousBikes.map((entry) => {
              const name = formatAppointmentBikeName(entry.make, entry.model);
              return (
                <Button
                  key={JSON.stringify([entry.make, entry.model, entry.serial])}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 max-w-full whitespace-normal break-words rounded-full px-3 py-2 text-left"
                  onClick={() => setBike({ name: name.length <= 100 ? name : entry.model, serial: entry.serial ?? '' })}
                >
                  Use {[name, entry.serial].filter(Boolean).join(' \u00b7 ')}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      <Input
        name="bikeModel"
        label="Product / E-bike name"
        placeholder="e.g., Avia Cruiser, Mini Cargo, Tiger 215"
        required
        maxLength={100}
        value={bike.name}
        onChange={(event) => setBike({ ...bike, name: event.target.value })}
        error={errors.bikeModel?.[0]}
      />
      <Input
        name="bikeSerialNumber"
        label="Serial number (optional)"
        helperText="Optional; it helps staff identify your bike."
        maxLength={100}
        value={bike.serial}
        onChange={(event) => setBike({ ...bike, serial: event.target.value })}
        error={errors.bikeSerialNumber?.[0]}
      />
    </>
  );
}
