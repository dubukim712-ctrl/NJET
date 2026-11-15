'use client';

import { useState } from 'react';
import type { LegalPolicyVersions } from '@/data/commerce/checkout-options';

export function useCheckoutPolicyConsent(currentVersions: LegalPolicyVersions) {
  const [consent, setConsent] = useState({
    termsAccepted: false,
    privacyAccepted: false,
    versions: currentVersions,
  });
  const versionsMatch = consent.versions.terms === currentVersions.terms
    && consent.versions['return-policy'] === currentVersions['return-policy']
    && consent.versions.privacy === currentVersions.privacy;

  const onTermsChange = (accepted: boolean) => setConsent((previous) => ({
    termsAccepted: accepted,
    privacyAccepted: versionsMatch ? previous.privacyAccepted : false,
    versions: currentVersions,
  }));
  const onPrivacyChange = (accepted: boolean) => setConsent((previous) => ({
    termsAccepted: versionsMatch ? previous.termsAccepted : false,
    privacyAccepted: accepted,
    versions: currentVersions,
  }));

  return {
    termsAccepted: versionsMatch && consent.termsAccepted,
    privacyAccepted: versionsMatch && consent.privacyAccepted,
    error: !versionsMatch
      ? 'The policies changed. Review and accept the current policies before ordering.'
      : !consent.termsAccepted || !consent.privacyAccepted
        ? 'Confirm both policy notices before placing your order.'
        : null,
    versions: consent.versions,
    onTermsChange,
    onPrivacyChange,
  };
}
