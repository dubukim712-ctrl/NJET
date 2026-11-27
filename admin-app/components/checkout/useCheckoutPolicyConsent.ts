'use client';

import { useState } from 'react';
import type { LegalPolicyVersions } from '@/data/commerce/checkout-options';

export function useCheckoutPolicyConsent(currentVersions: LegalPolicyVersions) {
  const [consent, setConsent] = useState({ accepted: false, versions: currentVersions });
  const versionsMatch = consent.versions.terms === currentVersions.terms
    && consent.versions['return-policy'] === currentVersions['return-policy']
    && consent.versions.privacy === currentVersions.privacy;

  return {
    accepted: versionsMatch && consent.accepted,
    error: !versionsMatch
      ? 'The policies changed. Review and accept the current policies before ordering.'
      : !consent.accepted
        ? 'Accept the policies before placing your order.'
        : null,
    versions: consent.versions,
    onAcceptedChange: (accepted: boolean) => setConsent({ accepted, versions: currentVersions }),
  };
}
