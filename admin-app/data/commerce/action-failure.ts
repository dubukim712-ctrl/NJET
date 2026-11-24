import type { ActionResult } from '@/data/actions/auth';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

export function commerceActionFailure(error: unknown, fallback: string): ActionResult {
  console.error(fallback, error);
  return { success: false, error: toUserFriendlyError(error, fallback) };
}
