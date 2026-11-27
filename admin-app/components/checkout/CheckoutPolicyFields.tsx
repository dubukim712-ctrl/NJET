'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { LegalPolicy } from '@/data/legal-policies';

export function CheckoutPolicyFields({
  legalPolicies,
  fieldErrors,
  accepted,
  onAcceptedChange,
}: {
  legalPolicies: LegalPolicy[];
  fieldErrors?: Record<string, string[]>;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}) {
  const id = useId();
  const [openPolicy, setOpenPolicy] = useState<'terms' | 'privacy' | null>(null);
  const policy = legalPolicies.find(({ slug }) => slug === openPolicy);
  const closePolicy = () => setOpenPolicy(null);
  const error = [
    ...(fieldErrors?.termsAccepted ?? []),
    ...(fieldErrors?.termsVersion ?? []),
    ...(fieldErrors?.returnPolicyVersion ?? []),
    ...(fieldErrors?.privacyAccepted ?? []),
    ...(fieldErrors?.privacyVersion ?? []),
  ].join(' ');

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Policies</h2>
      <div className="flex items-start gap-3 text-sm leading-6">
        <input
          id={id}
          type="checkbox"
          checked={accepted}
          aria-labelledby={id + '-agreement'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? id + '-error' : undefined}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          required
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span id={id + '-agreement'}>
          <label htmlFor={id}>I have read and agree to the</label>{' '}
          <Button type="button" variant="link" size={null} className="underline" aria-haspopup="dialog" onClick={() => setOpenPolicy('terms')}>
            Terms &amp; Conditions
          </Button>{' and '}
          <Button type="button" variant="link" size={null} className="underline" aria-haspopup="dialog" onClick={() => setOpenPolicy('privacy')}>
            Privacy Policy
          </Button>.
        </span>
      </div>
      {error && <p id={id + '-error'} role="alert" className="text-sm text-destructive">{error}</p>}
      <Modal open={Boolean(policy)} title={policy?.title ?? ''} onClose={closePolicy} size="wide">
        {policy && (
          <>
            <div
              role="region"
              aria-label={policy.title + ' content'}
              tabIndex={0}
              className="max-h-[60vh] space-y-4 overflow-y-auto overscroll-contain pr-3 text-sm leading-6"
            >
              <p className="text-muted-foreground">Version {policy.version} · Last updated {policy.lastUpdated}</p>
              <p>{policy.intro}</p>
              {policy.sections.map((section) => (
                <section key={section.id} className="space-y-2">
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && (
                    <ul className="list-disc space-y-1 pl-5">
                      {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                </section>
              ))}
              {policy.slug === 'terms' && (
                <Link className="font-medium text-primary underline underline-offset-4" href="/return-policy">
                  Return Policy
                </Link>
              )}
            </div>
            <footer className="mt-4 flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={closePolicy}>Close</Button>
              <Button type="button" onClick={() => {
                onAcceptedChange(true);
                closePolicy();
              }}>I Agree</Button>
            </footer>
          </>
        )}
      </Modal>
    </section>
  );
}
