'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { subscribeStaffChatInbox } from '@/data/support-chat/staff-inbox-realtime';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { isCompleteInbox, staffInboxOptions, type InboxCursor, type InboxStatus } from '@/data/support-chat/staff-inbox-client';
import { MessengerBadge } from '@/components/support-chat/MessengerBadge';
import { ChatConversation } from '@/components/support-chat/ChatConversation';
import { StaffChatEmptyState } from '@/components/support-chat/StaffChatEmptyState';
import { useChatViewport } from '@/components/support-chat/useChatViewport';
import type { SupportChatThread } from '@/types/support-chat';

export function StaffChatInbox({ userId }: { userId: string }) {
  const viewportRef = useChatViewport();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [status, setStatus] = useState<InboxStatus>('open');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [realtime, setRealtime] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const client = useQueryClient();
  const allKey = staffInboxOptions(userId, search, 'all').queryKey;
  const scope = useMemo(() => ['staff-chat-inbox', userId], [userId]);
  const query = useInfiniteQuery({
    ...staffInboxOptions(userId, search, status),
    initialData: () => {
      if (status === 'all') return undefined;
      const all = client.getQueryState<InfiniteData<SupportChatThread[], InboxCursor>>(allKey);
      if (!all?.data || all.isInvalidated || !isCompleteInbox(all.data.pages)) return undefined;
      const rows = all.data.pages.flat().filter((thread) => thread.status === status);
      return rows.length < 50 ? { pages: [rows], pageParams: [null] } : undefined;
    },
    initialDataUpdatedAt: () => client.getQueryState(allKey)?.dataUpdatedAt,
    placeholderData: (previous, previousQuery) => {
      if (status === 'all') return previousQuery?.queryKey[2] === search ? previous : undefined;
      const cached = client.getQueryData<InfiniteData<SupportChatThread[], InboxCursor>>(allKey);
      if (!cached) return previousQuery?.queryKey[2] === search && previous
        ? { ...previous, pages: [[]], pageParams: [null] }
        : undefined;
      return { ...cached, pages: cached.pages.map((page) => page.filter((thread) => thread.status === status)) };
    },
  });
  const threads = useMemo(() => {
    const byId = new Map<string, SupportChatThread>();
    for (const thread of query.data?.pages.flat() ?? []) {
      if (status === 'all' || thread.status === status) byId.set(thread.id, thread);
    }
    return [...byId.values()];
  }, [query.data, status]);
  const loadingMore = query.isFetchingNextPage;
  const hasMore = query.hasNextPage && !query.isPlaceholderData;
  const error = query.error?.message;

  useEffect(() => {
    if (query.isFetching || !query.data || status === 'all') return;
    const timer = window.setTimeout(() => {
      void client.prefetchInfiniteQuery(staffInboxOptions(userId, search, 'all'));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [client, query.data, query.isFetching, search, status, userId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeStaffChatInbox((event) => {
      if (event === 'offline') {
        setRealtime('offline');
        return;
      }
      if (event === 'connected') setRealtime('connected');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void client.invalidateQueries({ queryKey: scope }), 200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [client, scope]);

  useEffect(() => {
    if (realtime === 'connected') return;
    const timer = window.setInterval(() => {
      void client.invalidateQueries({ queryKey: scope });
    }, 30_000);
    return () => clearInterval(timer);
  }, [client, realtime, scope]);
  const selectedThread = threads.find((thread) => thread.id === selectedId);
  const mobileConversationOpen = showMobileConversation && Boolean(selectedThread);
  const searchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === search) return;
    setSelectedId(null);
    setShowMobileConversation(false);
    setSearch(nextSearch);
  };
  const changeStatus = (next: InboxStatus) => {
    if (next === status) return;
    setSelectedId(null);
    setShowMobileConversation(false);
    setStatus(next);
  };
  const warmStatus = (next: InboxStatus) => {
    if (next !== status) void client.prefetchInfiniteQuery(staffInboxOptions(userId, search, next));
  };

  const loadMore = () => {
    if (hasMore && !query.isFetching) void query.fetchNextPage({ cancelRefetch: false });
  };
  const updateStatus = (next: 'open' | 'resolved') => {
    client.setQueriesData<InfiniteData<SupportChatThread[], InboxCursor>>(
      { queryKey: scope },
      (current) => current && ({
        ...current,
        pages: current.pages.map((page) => page.map((thread) =>
          thread.id === selectedId ? { ...thread, status: next } : thread,
        )),
      }),
    );
    void client.invalidateQueries({ queryKey: scope });
  };

  return (
    <div ref={viewportRef} className="mx-auto max-w-7xl max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:bottom-[var(--chat-viewport-bottom,0px)] max-lg:max-h-[calc(100dvh-4rem)] max-lg:z-30 max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:bg-background max-lg:p-4">
      <header className={`${mobileConversationOpen ? 'max-lg:hidden' : ''} mb-6 flex shrink-0 flex-col gap-3 border-b pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Customer support
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Chats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every permitted staff member can read the full conversation history.
          </p>
        </div>
        <p className="text-xs text-muted-foreground" role="status">
          {realtime === 'connected' ? 'Live updates on' : 'Reconnecting to live updates…'}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.5fr)] max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col">
        <section className={`${mobileConversationOpen ? 'hidden lg:flex' : 'flex'} min-h-[26rem] flex-col overflow-hidden rounded-2xl border bg-card max-lg:min-h-0 max-lg:flex-1 lg:max-h-[min(74dvh,52rem)]`}>
          <div className="border-b p-3 sm:p-4">
            <form onSubmit={searchSubmit} className="flex gap-2">
              <label className="sr-only" htmlFor="chat-search">Search chats</label>
              <Input containerClassName="flex-1"
                id="chat-search"
                value={searchInput}
                maxLength={100}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, contact, message"
                className="min-h-10! rounded-lg! bg-background!"
              />
              <Button variant={null} size={null}
                type="submit"
                aria-label="Search chats"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border hover:bg-accent"
              >
                <Search className="size-4" aria-hidden="true" />
              </Button>
            </form>
            <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1" aria-label="Filter chats">
              {(['open', 'resolved', 'all'] as const).map((filter) => (
                <Button variant={null} size={null}
                  type="button"
                  key={filter}
                  onClick={() => changeStatus(filter)}
                  onMouseEnter={() => warmStatus(filter)}
                  onFocus={() => warmStatus(filter)}
                  aria-pressed={status === filter}
                  className={`min-h-9 flex-1 rounded-md px-2 text-xs font-medium capitalize ${status === filter ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="px-4 py-3 text-sm text-destructive">
              {error}{' '}
              <Button variant={null} size={null} type="button" className="text-inherit underline" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </div>
          )}

          {query.isPlaceholderData && <p className="px-4 py-2 text-xs text-muted-foreground" role="status">Updating chats…</p>}
          {query.isPending ? (
            <div className="space-y-2 p-3" role="status" aria-label="Loading chats">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            query.isPlaceholderData || error ? null : <StaffChatEmptyState search={search} status={status} />
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {threads.map((thread) => {
                const active = thread.id === selectedId;
                return (
                  <li key={thread.id}>
                    <Button variant={null} size={null}
                      type="button"
                      onClick={() => {
                        setSelectedId(thread.id);
                        setShowMobileConversation(true);
                      }}
                      aria-current={active ? 'true' : undefined}
                      className={`block w-full whitespace-normal rounded-xl p-3 text-left text-base font-normal ${active ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 font-semibold">{thread.is_unread && <span role="img" aria-label="Unread" className="size-2 shrink-0 rounded-full bg-primary" />}<span className="truncate">{thread.customer_name}</span></span>
                        <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={thread.last_message_at}>
                          {new Date(thread.last_message_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {thread.channel === 'messenger' ? <MessengerBadge /> : (thread.guest_email ?? thread.guest_phone ?? (thread.customer_kind === 'account' ? 'Account customer' : 'Guest'))}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                        <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
                        {thread.last_message_deleted
                          ? 'Message deleted'
                          : thread.last_message_body || 'No messages yet'}
                      </p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${thread.status === 'open' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {thread.status}
                      </span>
                    </Button>
                  </li>
                );
              })}
              {hasMore && (
                <li className="p-2">
                  <Button variant={null} size={null}
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="min-h-10 w-full rounded-lg border text-sm font-medium hover:bg-accent disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : 'Load older conversations'}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </section>

        <div className={`min-w-0 ${mobileConversationOpen ? 'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col' : 'hidden lg:block'}`}>
          {selectedThread ? (
            <>
              <Button variant={null} size={null}
                type="button"
                onClick={() => setShowMobileConversation(false)}
                className="mb-3 min-h-10 justify-start gap-2 rounded-lg px-2 hover:bg-accent lg:hidden"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to inbox
              </Button>
              <div className="mb-3 shrink-0 rounded-xl border bg-card px-4 py-3">
                <h2 className="flex flex-wrap items-center gap-2 font-semibold">{selectedThread.customer_name}{selectedThread.channel === "messenger" && <MessengerBadge />}</h2>
                {selectedThread.channel === 'web' && <p className="mt-1 break-all text-sm text-muted-foreground">
                  {selectedThread.guest_email ?? selectedThread.guest_phone ?? (selectedThread.customer_kind === 'account' ? 'Account customer' : 'Guest')}
                </p>}
              </div>
              <ChatConversation
                key={selectedThread.id}
                threadId={selectedThread.id}
                mode="staff"
                userId={userId}
                status={selectedThread.status}
                onStatusChange={selectedThread.last_sender_role ? updateStatus : undefined}
                fillHeight
              />
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
