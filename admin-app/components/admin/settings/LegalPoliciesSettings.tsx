'use client';

import { useState, type KeyboardEvent } from 'react';
import { Select } from '@/components/ui/Select';
import { LegalPolicyEditor } from '@/components/admin/settings/LegalPolicyEditor';
import type { LegalPolicy, LegalPolicySlug } from '@/data/legal-policies';

const POLICY_TABS: { slug: LegalPolicySlug; label: string }[] = [
  { slug: 'terms', label: 'Terms & Conditions' },
  { slug: 'return-policy', label: 'Return Policy' },
  { slug: 'privacy', label: 'Privacy' },
];

export function LegalPoliciesSettings({
  policies,
}: {
  policies: LegalPolicy[];
}) {
  const [activeSlug, setActiveSlug] = useState<LegalPolicySlug>('terms');

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: LegalPolicySlug
  ) => {
    const index = POLICY_TABS.findIndex((tab) => tab.slug === current);
    const nextIndex = event.key === 'ArrowRight'
      ? (index + 1) % POLICY_TABS.length
      : event.key === 'ArrowLeft'
        ? (index - 1 + POLICY_TABS.length) % POLICY_TABS.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? POLICY_TABS.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = POLICY_TABS[nextIndex].slug;
    setActiveSlug(nextTab);
    document.getElementById(`legal-policy-${nextTab}-tab`)?.focus();
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold">Storefront legal policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the content shown on the public storefront. Each save publishes a
          new version; previous versions remain available for order records.
        </p>
      </header>
      <Select
        id="legal-policy-section"
        label="Legal policy"
        value={activeSlug}
        onValueChange={(value) => setActiveSlug(value as LegalPolicySlug)}
        containerClassName="md:hidden"
        className="min-h-11"
      >
        {POLICY_TABS.map((tab) => (
          <option key={tab.slug} value={tab.slug}>{tab.label}</option>
        ))}
      </Select>
      <div
        role="tablist"
        aria-label="Legal policies"
        className="hidden gap-2 overflow-x-auto border-b md:flex"
      >
        {POLICY_TABS.map((tab) => (
          <button
            key={tab.slug}
            id={`legal-policy-${tab.slug}-tab`}
            type="button"
            role="tab"
            aria-selected={activeSlug === tab.slug}
            aria-controls={`legal-policy-${tab.slug}-panel`}
            tabIndex={activeSlug === tab.slug ? 0 : -1}
            onClick={() => setActiveSlug(tab.slug)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.slug)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeSlug === tab.slug
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {POLICY_TABS.map((tab) => {
        const policy = policies.find((item) => item.slug === tab.slug);
        return (
          <div
            key={tab.slug}
            id={`legal-policy-${tab.slug}-panel`}
            role="tabpanel"
            aria-labelledby={`legal-policy-${tab.slug}-tab`}
            tabIndex={0}
            hidden={activeSlug !== tab.slug}
          >
            {policy ? (
              <LegalPolicyEditor
                policy={policy}
              />
            ) : (
              <p className="text-sm text-destructive" role="alert">
                This policy could not be loaded. Refresh settings and try again.
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
