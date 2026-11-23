'use client';

import { useId } from 'react';
import Link from 'next/link';

export function CheckoutPolicyFields({
  fieldErrors,
  onTermsChange,
  onPrivacyChange,
}: {
  fieldErrors?: Record<string, string[]>;
  onTermsChange: (accepted: boolean) => void;
  onPrivacyChange: (accepted: boolean) => void;
}) {
  const id = useId();
  const termsError = [
    ...(fieldErrors?.termsAccepted ?? []),
    ...(fieldErrors?.termsVersion ?? []),
    ...(fieldErrors?.returnPolicyVersion ?? []),
  ].join(' ');
  const privacyError = [
    ...(fieldErrors?.privacyAccepted ?? []),
    ...(fieldErrors?.privacyVersion ?? []),
  ].join(' ');

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Policies</h2>
      <p className="text-sm leading-5 text-muted-foreground">
        Please review these policies before placing your order.
      </p>
      <nav aria-label="Customer policies" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link className="font-medium text-primary underline underline-offset-4" href="/terms">
          Terms &amp; Conditions
        </Link>
        <Link className="font-medium text-primary underline underline-offset-4" href="/return-policy">
          Return &amp; Refund Policy
        </Link>
        <Link className="font-medium text-primary underline underline-offset-4" href="/privacy">
          Privacy Policy
        </Link>
      </nav>
      <label className="flex items-start gap-3 text-sm leading-5">
        <input
          type="checkbox"
          aria-invalid={Boolean(termsError)}
          aria-describedby={termsError ? id + "-terms" : undefined}
          onChange={(event) => onTermsChange(event.target.checked)}
          required
          className="mt-1 size-4 accent-primary"
        />
        <span>I agree to the Terms &amp; Conditions.</span>
      </label>
      {termsError && <p id={id + "-terms"} role="alert" className="text-sm text-destructive">{termsError}</p>}
      <label className="flex items-start gap-3 text-sm leading-5">
        <input
          type="checkbox"
          aria-invalid={Boolean(privacyError)}
          aria-describedby={privacyError ? id + "-privacy" : undefined}
          onChange={(event) => onPrivacyChange(event.target.checked)}
          required
          className="mt-1 size-4 accent-primary"
        />
        <span>I acknowledge the Privacy Policy.</span>
      </label>
      {privacyError && <p id={id + "-privacy"} role="alert" className="text-sm text-destructive">{privacyError}</p>}
    </section>
  );
}
