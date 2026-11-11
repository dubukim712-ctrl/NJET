'use client';

import { useState, type KeyboardEvent } from 'react';
import { BusinessInfoEditor } from '@/components/admin/settings/BusinessInfoEditor';
import { OwnershipCertificateTemplateSettings } from '@/components/admin/settings/OwnershipCertificateTemplateSettings';
import { PaymentRecipientEditor } from '@/components/admin/settings/PaymentRecipientEditor';
import { PAYMENT_PROVIDER_OPTIONS } from '@/data/commerce/payment-recipients';
import type { AdminSystemSettings } from '@/data/commerce/system-settings';

type SettingsTab = 'business' | 'payments' | 'certificates';
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'payments', label: 'Payment Accounts' },
  { id: 'certificates', label: 'Certificates' },
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
      <div
        role="tablist"
        aria-label="Global settings"
        className="flex gap-2 overflow-x-auto border-b"
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
        <div className="grid min-w-0 gap-4 xl:grid-cols-3">
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
        id="settings-certificates-panel"
        role="tabpanel"
        aria-labelledby="settings-certificates-tab"
        tabIndex={0}
        hidden={activeTab !== 'certificates'}
      >
        <OwnershipCertificateTemplateSettings template={settings.certificateTemplate} />
      </section>
    </div>
  );
}
