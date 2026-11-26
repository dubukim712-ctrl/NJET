'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { createClient } from '@/data/supabase/client';
import { listSupportChatThreadsAction } from '@/data/actions/support-chat';
import { MessengerBadge } from '@/components/support-chat/MessengerBadge';
import { ChatConversation } from '@/components/support-chat/ChatConversation';
import { StaffChatEmptyState } from '@/components/support-chat/StaffChatEmptyState';
import type { SupportChatThread } from '@/types/support-chat';

export function StaffChatInbox({ userId }: { userId: string }) {
  const [threads, setThreads] = useState<SupportChatThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [status, setStatus] = useState<'all' | 'open' | 'resolved'>('open');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  const loadThreads = useCallback(async (
    append = false,
    cursor?: { lastMessageAt: string; threadId: string },
  ) => {
    const result = await listSupportChatThreadsAction({
      status,
      search,
      ...(cursor
        ? {
            beforeLastMessageAt: cursor.lastMessageAt,
            beforeThreadId: cursor.threadId,
          }
        : {}),
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setThreads((current) => append ? [...current, ...result.data] : result.data);
    if (!append && result.data.length > 0) {
      setSelectedId((current) => current ?? result.data[0].id);
    }
    setHasMore(result.data.length === 50);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => void loadThreads(), 0);
    return () => clearTimeout(timer);
  }, [loadThreads]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel('support-chat:staff-inbox', { config: { private: true } })
      .on('broadcast', { event: 'chat_changed' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (active) void loadThreads();
        }, 200);
      })
      .subscribe((state) => {
        if (!active) return;
        if (state === 'SUBSCRIBED') setRealtime('connected');
        else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
          setRealtime('offline');
        }
      });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadThreads]);

  useEffect(() => {
    if (realtime === 'connected') return;
    const timer = setInterval(() => void loadThreads(), 30_000);
    return () => clearInterval(timer);
  }, [loadThreads, realtime]);

  const selectedThread = threads.find((thread) => thread.id === selectedId);
  const mobileConversationOpen = showMobileConversation && Boolean(selectedThread);

  const searchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === search) return;
    setThreads([]);
    setSelectedId(null);
    setShowMobileConversation(false);
    setLoading(true);
    setSearch(nextSearch);
  };

  const changeStatus = (next: 'all' | 'open' | 'resolved') => {
    if (next === status) return;
    setThreads([]);
    setSelectedId(null);
    setShowMobileConversation(false);
    setLoading(true);
    setStatus(next);
  };

  const loadMore = () => {
    const last = threads[threads.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    void loadThreads(true, {
      lastMessageAt: last.last_message_at,
      threadId: last.id,
    });
  };

  const updateStatus = (next: 'open' | 'resolved') => {
    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedId ? { ...thread, status: next } : thread,
      ),
    );
    void loadThreads();
  };

  return (
    <div className="mx-auto max-w-7xl max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:bottom-0 max-lg:z-30 max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:bg-background max-lg:p-4">
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
              <input
                id="chat-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, contact, message"
                className="min-h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                aria-label="Search chats"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border hover:bg-accent"
              >
                <Search className="size-4" aria-hidden="true" />
              </button>
            </form>
            <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1" aria-label="Filter chats">
              {(['open', 'resolved', 'all'] as const).map((filter) => (
                <button
                  type="button"
                  key={filter}
                  onClick={() => changeStatus(filter)}
                  aria-pressed={status === filter}
                  className={`min-h-9 flex-1 rounded-md px-2 text-xs font-medium capitalize ${status === filter ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="px-4 py-3 text-sm text-destructive">
              {error}{' '}
              <button type="button" className="underline" onClick={() => void loadThreads()}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2 p-3" role="status" aria-label="Loading chats">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <StaffChatEmptyState search={search} status={status} />
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {threads.map((thread) => {
                const active = thread.id === selectedId;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(thread.id);
                        setShowMobileConversation(true);
                      }}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-xl p-3 text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate font-semibold">{thread.customer_name}</span>
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
                    </button>
                  </li>
                );
              })}
              {hasMore && (
                <li className="p-2">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="min-h-10 w-full rounded-lg border text-sm font-medium hover:bg-accent disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : 'Load older conversations'}
                  </button>
                </li>
              )}
            </ul>
          )}
        </section>

        <div className={`min-w-0 ${mobileConversationOpen ? 'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col' : 'hidden lg:block'}`}>
          {selectedThread ? (
            <>
              <button
                type="button"
                onClick={() => setShowMobileConversation(false)}
                className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to inbox
              </button>
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
