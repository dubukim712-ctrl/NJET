'use client';

import { infiniteQueryOptions } from '@tanstack/react-query';
import { listSupportChatThreadsAction } from '@/data/actions/support-chat';
import type { SupportChatThread } from '@/types/support-chat';

export type InboxStatus = 'all' | 'open' | 'resolved';
export type InboxCursor = { lastMessageAt: string; threadId: string } | null;
const pageSize = 50;

export function staffInboxOptions(userId: string, search: string, status: InboxStatus) {
  return infiniteQueryOptions({
    queryKey: ['staff-chat-inbox', userId, search, status],
    initialPageParam: null as InboxCursor,
    queryFn: async ({ pageParam }) => {
      const result = await listSupportChatThreadsAction({
        status, search,
        beforeLastMessageAt: pageParam?.lastMessageAt,
        beforeThreadId: pageParam?.threadId,
      }, userId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    getNextPageParam: (page): InboxCursor | undefined => {
      const last = page.at(-1);
      return page.length === pageSize && last
        ? { lastMessageAt: last.last_message_at, threadId: last.id }
        : undefined;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: 15 * 60_000,
  });
}

export function isCompleteInbox(pages: SupportChatThread[][]) {
  return (pages.at(-1)?.length ?? pageSize) < pageSize;
}
