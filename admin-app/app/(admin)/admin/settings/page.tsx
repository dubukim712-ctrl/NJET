import { SystemSettingsManager } from '@/components/admin/settings/SystemSettingsManager';
import { getAdminSystemSettings } from '@/data/commerce/system-settings';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const result = await getAdminSystemSettings();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Global</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage business information, payment accounts, and ownership certificates.
        </p>
      </header>
      {result.error || !result.data ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <h2 className="font-semibold">Settings are unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </section>
      ) : (
        <SystemSettingsManager settings={result.data} />
      )}
    </div>
  );
}
