'use client';

import { useState, type KeyboardEvent } from 'react';
import { Select } from '@/components/ui/Select';
import { BusinessInfoEditor } from '@/components/admin/settings/BusinessInfoEditor';
import { BranchServiceHoursSettings } from '@/components/admin/settings/BranchServiceHoursSettings';
import { OwnershipCertificateTemplateSettings } from '@/components/admin/settings/OwnershipCertificateTemplateSettings';
import { SalesReceiptTemplateSettings } from '@/components/admin/settings/SalesReceiptTemplateSettings';
import { PaymentRecipientEditor } from '@/components/admin/settings/PaymentRecipientEditor';
import { LegalPoliciesSettings } from '@/components/admin/settings/LegalPoliciesSettings';
import { CheckoutPhoneVerificationSettings } from '@/components/admin/settings/CheckoutPhoneVerificationSettings';
import { PAYMENT_PROVIDER_OPTIONS } from '@/data/commerce/payment-recipients';
import type { AdminSystemSettings } from '@/data/commerce/system-settings';

type SettingsTab = 'business' | 'service-hours' | 'checkout' | 'payments' | 'documents' | 'policies';
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'service-hours', label: 'Service hours' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'payments', label: 'Payment Accounts' },
  { id: 'documents', label: 'Documents' },
  { id: 'policies', label: 'Policies' },
];

export function SystemSettingsManager({
  settings,
}: {
  settings: AdminSystemSettings;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: SettingsTab
  ) => {
    const index = SETTINGS_TABS.findIndex((tab) => tab.id === current);
    const nextIndex = event.key === 'ArrowRight'
      ? (index + 1) % SETTINGS_TABS.length
      : event.key === 'ArrowLeft'
        ? (index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? SETTINGS_TABS.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = SETTINGS_TABS[nextIndex].id;
    setActiveTab(nextTab);
    document.getElementById(`settings-${nextTab}-tab`)?.focus();
  };

  return (
    <div className="space-y-6">
      <Select
        id="settings-section"
        label="Settings section"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
        containerClassName="md:hidden"
        className="min-h-11"
      >
        {SETTINGS_TABS.map((tab) => (
          <option key={tab.id} value={tab.id}>{tab.label}</option>
        ))}
      </Select>
      <div
        role="tablist"
        aria-label="Global settings"
        className="hidden gap-2 overflow-x-auto border-b md:flex"
      >
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`settings-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`settings-${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        id="settings-business-panel"
        role="tabpanel"
        aria-labelledby="settings-business-tab"
        tabIndex={0}
        hidden={activeTab !== 'business'}
      >
        <BusinessInfoEditor businessInfo={settings.businessInfo} />
      </section>

      <section
        id="settings-service-hours-panel"
        role="tabpanel"
        aria-labelledby="settings-service-hours-tab"
        tabIndex={0}
        hidden={activeTab !== 'service-hours'}
      >
        <BranchServiceHoursSettings
          branches={settings.branchServiceHours.branches}
          hours={settings.branchServiceHours.hours}
        />
      </section>

      <section
        id="settings-checkout-panel"
        role="tabpanel"
        aria-labelledby="settings-checkout-tab"
        tabIndex={0}
        hidden={activeTab !== 'checkout'}
      >
        <CheckoutPhoneVerificationSettings
          required={settings.checkoutSettings.phoneVerificationRequired}
        />
      </section>

      <section
        id="settings-payments-panel"
        role="tabpanel"
        aria-labelledby="settings-payments-tab"
        tabIndex={0}
        hidden={activeTab !== 'payments'}
        className="space-y-4"
      >
        <header>
          <h2 className="text-xl font-semibold tracking-tight">Online payment recipients</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add fallback accounts, then deactivate any recipient that is temporarily unavailable.
          </p>
        </header>
        <div className="grid min-w-0 gap-4">
          {PAYMENT_PROVIDER_OPTIONS.map(({ value }) => (
            <PaymentRecipientEditor
              key={value}
              provider={value}
              recipients={settings.paymentRecipients.filter(
                (recipient) => recipient.provider === value
              )}
            />
          ))}
        </div>
      </section>

      <section
        id="settings-documents-panel"
        role="tabpanel"
        aria-labelledby="settings-documents-tab"
        tabIndex={0}
        hidden={activeTab !== 'documents'}
      >
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <OwnershipCertificateTemplateSettings template={settings.certificateTemplate} />
          <SalesReceiptTemplateSettings template={settings.receiptTemplate} />
        </div>
      </section>

      <section
        id="settings-policies-panel"
        role="tabpanel"
        aria-labelledby="settings-policies-tab"
        tabIndex={0}
        hidden={activeTab !== 'policies'}
      >
        <LegalPoliciesSettings policies={settings.legalPolicies} />
      </section>
    </div>
  );
}
