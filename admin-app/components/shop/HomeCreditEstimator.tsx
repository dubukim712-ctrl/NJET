'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatPhp } from '@/lib/commerce';

type EstimateModel = { id: string; name: string; price: number; downpayment: number };
const terms = [6, 12, 24, 36];

export function HomeCreditEstimator({ models }: { models: EstimateModel[] }) {
  const [modelId, setModelId] = useState(models[0]?.id);
  const [term, setTerm] = useState(24);
  const [downpayment, setDownpayment] = useState(models[0]?.downpayment ?? 0);
  const model = models.find(({ id }) => id === modelId);
  const monthly = model ? Math.round((model.price - downpayment) / term) : null;

  return (
    <section id="installments" className="scroll-mt-32 rounded-3xl bg-[#1F2A2E] p-6 text-[#fffefa] sm:p-10">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold text-[#b9ddbd]">Home Credit</p>
          <h2 className="mt-2 max-w-sm text-3xl font-semibold tracking-tight sm:text-4xl">Plan your monthly payment</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#dbe2de]">
            Bring one eligible government-issued ID to apply at an NJET branch. Approval, eligible terms, interest, and fees depend on Home Credit.
          </p>
          <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#cce4c6] px-4 text-sm font-semibold text-[#1f2a2e] hover:bg-white">
            Explore the shop <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {model ? (
          <div className="space-y-5 rounded-2xl border border-white/20 bg-white/5 p-4 sm:p-6">
            <label className="block text-sm font-medium">
              E-bike
              <select value={modelId} onChange={(event) => {
                const selected = models.find(({ id }) => id === event.target.value);
                if (!selected) return;
                setModelId(selected.id);
                setDownpayment(selected.downpayment);
              }} className="mt-2 block min-h-11 w-full rounded-lg border border-white/30 bg-[#1F2A2E] px-3 text-base">
                {models.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              <span className="flex justify-between gap-4"><span>Downpayment</span><span>{formatPhp(downpayment)}</span></span>
              <input
                type="range" min={0} max={model.price} step={1} value={downpayment}
                onChange={(event) => setDownpayment(event.target.valueAsNumber)}
                aria-valuetext={formatPhp(downpayment)}
                className="mt-2 block h-7 w-full accent-[#cce4c6]"
              />
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Term in months</legend>
              <div className="grid grid-cols-4 gap-2">
                {terms.map((months) => (
                  <button key={months} type="button" aria-pressed={months === term} onClick={() => setTerm(months)}
                    className={`min-h-11 rounded-full border px-2 text-sm font-semibold ${months === term ? 'border-[#cce4c6] bg-[#cce4c6] text-[#1f2a2e]' : 'border-white/30 hover:bg-white/10'}`}>
                    {months}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="border-t border-white/20 pt-4">
              <p className="text-sm text-[#dbe2de]">Estimated Monthly Payment</p>
              <output className="mt-1 block text-3xl font-semibold tabular-nums sm:text-4xl">
                {formatPhp(monthly ?? 0)} <span className="text-base font-medium">/ mo</span>
              </output>
              <p className="mt-2 text-xs text-[#dbe2de]">Planning estimate based on the cash price less downpayment, divided by the term. Excludes interest and fees.</p>
            </div>
          </div>
        ) : <p className="text-sm text-[#dbe2de]">Model pricing is temporarily unavailable. Visit the shop for current prices.</p>}
      </div>
    </section>
  );
}
