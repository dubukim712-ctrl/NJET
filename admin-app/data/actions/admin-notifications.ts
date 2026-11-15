'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import type { AdminNotification } from '@/types/database';

export type AdminNotificationsData = {
  notifications: AdminNotification[];
  unreadCount: number;
  hasMore: boolean;
};

const notificationQuerySchema = z.object({
  before: z.object({
    created_at: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  }).strict().optional(),
  limit: z.number().int().min(1).max(50),
}).strict();

function failure(error: unknown, message: string): ActionResult<never> {
  console.error(message, error);
  return { success: false, error: message };
}

export async function getAdminNotificationsAction(
  payload: unknown
): Promise<
  ActionResult<AdminNotificationsData>
> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.adminAccess,
    '/admin/notifications'
  );
  const parsed = notificationQuerySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid notification history request.' };
  }

  try {
    let notificationQuery = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', profile.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(parsed.data.limit + 1);
    if (parsed.data.before) {
      notificationQuery = notificationQuery.or(
        `created_at.lt.${parsed.data.before.created_at},and(created_at.eq.${parsed.data.before.created_at},id.lt.${parsed.data.before.id})`
      );
    }

    const [notifications, unread] = await Promise.all([
      notificationQuery,
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', profile.id)
        .is('read_at', null),
    ]);

    if (notifications.error) {
      return failure(notifications.error, 'Could not load notifications.');
    }
    if (unread.error) {
      return failure(unread.error, 'Could not load the unread notification count.');
    }

    return {
      success: true,
      data: {
        notifications: notifications.data.slice(0, parsed.data.limit),
        unreadCount: unread.count ?? 0,
        hasMore: notifications.data.length > parsed.data.limit,
      },
    };
  } catch (error) {
    return failure(error, 'Could not load notifications.');
  }
}

const notificationIdSchema = z.string().uuid();

export async function markAdminNotificationReadAction(
  notificationId: unknown
): Promise<ActionResult> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.adminAccess,
    '/admin/notifications'
  );
  const parsed = notificationIdSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { success: false, error: 'Select a valid notification.' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', parsed.data)
      .eq('recipient_user_id', profile.id)
      .is('read_at', null);
    if (error) return failure(error, 'Could not mark the notification as read.');
    revalidatePath('/admin/notifications');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not mark the notification as read.');
  }
}

export async function markAllAdminNotificationsReadAction(): Promise<ActionResult> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.adminAccess,
    '/admin/notifications'
  );

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_user_id', profile.id)
      .is('read_at', null);
    if (error) return failure(error, 'Could not mark notifications as read.');
    revalidatePath('/admin/notifications');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not mark notifications as read.');
  }
}
