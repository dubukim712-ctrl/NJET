'use server';

import type { ActionResult } from '@/data/actions/auth';
import { getAdminSystemSettings } from '@/data/commerce/system-settings';
import type { AdminSystemSettings } from '@/data/commerce/system-settings';

export async function getAdminSystemSettingsAction(): Promise<
  ActionResult<AdminSystemSettings>
> {
  const result = await getAdminSystemSettings();
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'System settings could not be loaded.',
    };
  }

  return { success: true, data: result.data };
}
