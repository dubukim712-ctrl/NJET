'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatPhp } from '@/lib/commerce';

const terms = [6, 12, 24, 36];

export function ProductPaymentTerms({ priceMinor, downpaymentMinor }: {
  priceMinor: number;
  downpaymentMinor: number;
}) {
  const [term, setTerm] = useState(24);
  const monthly = Math.round(Math.max(0, priceMinor - downpaymentMinor) / term);

  return (
    <fieldset className="mt-3 space-y-2">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">Term in months</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {terms.map((months) => (
          <Button key={months} type="button" variant={term === months ? 'default' : 'outline'} size={null}
            aria-pressed={term === months} onClick={() => setTerm(months)} className="min-h-11 rounded-full px-1">
            {months}
          </Button>
        ))}
      </div>
      <p className="text-sm font-semibold text-primary" aria-live="polite">Est. {formatPhp(monthly)}/mo</p>
      <p className="text-xs text-muted-foreground">Excludes interest and fees.</p>
    </fieldset>
  );
}
