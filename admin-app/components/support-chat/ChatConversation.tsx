'use client';

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { AlertCircle, Check, LoaderCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { createClient } from '@/data/supabase/client';
import {
  deleteSupportChatMessageAction,
  markSupportChatThreadReadAction,
  loadSupportChatMessagesAction,
  sendSupportChatMessageAction,
  setSupportChatStatusAction,
} from '@/data/actions/support-chat';
import { ChatMessageList } from '@/components/support-chat/ChatMessageList';
import { messengerUrl } from '@/lib/support-chat/messenger-link';
import type { SupportChatMessage } from '@/types/support-chat';

interface ChatConversationProps {
  threadId: string;
  mode: 'customer' | 'staff';
  userId: string | null;
  realtimeKey?: string;
  status?: 'open' | 'resolved';
  onStatusChange?: (status: 'open' | 'resolved') => void;
  fillHeight?: boolean;
}

export function ChatConversation({
  threadId,
  mode,
  userId,
  realtimeKey,
  status = 'open',
  onStatusChange,
  fillHeight = false,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  const loadLatest = useCallback(async () => {
    const markAsRead = async () => {
      if (mode !== 'staff') return null;
      try {
        const readResult = await markSupportChatThreadReadAction({ threadId });
        return readResult.success ? null : readResult.error;
      } catch {
        return 'The chat could not be marked as read.';
      }
    };
    const [result, readError] = await Promise.all([
      loadSupportChatMessagesAction({ threadId }),
      markAsRead(),
    ]);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const latest = [...result.data].reverse();
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of latest) byId.set(message.id, message);
      return [...byId.values()].sort(
        (a, b) =>
          a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
      );
    });
    setHasOlder(result.data.length === 50);
    setError(readError);
    setLoading(false);
  }, [mode, threadId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadLatest(), 0);
    return () => clearTimeout(timer);
  }, [loadLatest]);

  useEffect(() => {
    const topic =
      mode === 'customer' && realtimeKey
        ? `support-chat:guest:${realtimeKey}`
        : `support-chat:thread:${threadId}`;
    const supabase = createClient();
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (active) void loadLatest();
      }, 200);
    };

    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'chat_changed' }, scheduleRefresh)
      .subscribe((state) => {
        if (!active) return;
        if (state === 'SUBSCRIBED') setRealtimeState('connected');
        else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
          setRealtimeState('offline');
        }
      });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [loadLatest, mode, realtimeKey, threadId]);

  useEffect(() => {
    if (realtimeState === 'connected') return;
    const timer = setInterval(() => void loadLatest(), 30_000);
    return () => clearInterval(timer);
  }, [loadLatest, realtimeState]);

  const loadOlder = async () => {
    const first = messages[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const result = await loadSupportChatMessagesAction({
      threadId,
      beforeCreatedAt: first.created_at,
      beforeId: first.id,
    });
    if (!result.success) {
      setError(result.error);
    } else {
      const older = [...result.data].reverse();
      setMessages((current) => [...older, ...current]);
      setHasOlder(result.data.length === 50);
    }
    setLoadingOlder(false);
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    const result = await sendSupportChatMessageAction({ threadId, body });
    if (!result.success) {
      setError(result.error);
    } else {
      setBody('');
      await loadLatest();
    }
    setSending(false);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      !body.trim() ||
      sending ||
      !window.matchMedia('(min-width: 1024px)').matches
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const deleteMessage = async (
    messageId: string,
    scope: 'for_you' | 'for_everyone',
  ) => {
    const result = await deleteSupportChatMessageAction({ messageId, scope });
    if (!result.success) setError(result.error);
    else await loadLatest();
  };

  const toggleStatus = async () => {
    if (!onStatusChange || updatingStatus) return;
    const nextStatus = status === 'open' ? 'resolved' : 'open';
    setUpdatingStatus(true);
    const result = await setSupportChatStatusAction({ threadId, status: nextStatus });
    if (!result.success) setError(result.error);
    else onStatusChange(nextStatus);
    setUpdatingStatus(false);
  };

  return (
    <section className={`flex h-[min(70dvh,46rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-sm ${fillHeight ? 'max-lg:h-full max-lg:min-h-0 max-lg:flex-1' : ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <p className="font-semibold">{mode === 'staff' ? 'Conversation' : 'Messages'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {realtimeState === 'connected' ? 'Live updates on' : 'Reconnecting…'}
          </p>
        </div>
        {mode === 'customer' && messengerUrl && (
          <a
            href={messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center text-xs font-medium text-primary underline underline-offset-4"
          >
            Prefer Messenger?
          </a>
        )}
        {mode === 'staff' && onStatusChange && (
          <Button variant={null} size={null}
            type="button"
            onClick={toggleStatus}
            disabled={updatingStatus}
            className="min-h-9 gap-2 rounded-full border px-3 hover:bg-accent disabled:opacity-60"
          >
            {updatingStatus ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : status === 'open' ? (
              <Check className="size-4" aria-hidden="true" />
            ) : null}
            {status === 'open' ? 'Resolve chat' : 'Reopen chat'}
          </Button>
        )}
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 border-b bg-destructive/5 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <Button variant={null} size={null} type="button" className="ml-auto self-start text-inherit underline" onClick={() => void loadLatest()}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center" role="status">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Loading messages" />
        </div>
      ) : (
        <ChatMessageList
          messages={messages}
          mode={mode}
          userId={userId}
          hasOlder={hasOlder}
          loadingOlder={loadingOlder}
          onLoadOlder={() => void loadOlder()}
          onDelete={(id, scope) => void deleteMessage(id, scope)}
        />
      )}

      <form onSubmit={send} className="flex shrink-0 items-end gap-2 border-t bg-card/60 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-4 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <label className="sr-only" htmlFor={`chat-message-${threadId}`}>Write a message</label>
        <Textarea containerClassName="flex-1"
          id={`chat-message-${threadId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          maxLength={4000}
          rows={2}
          placeholder="Write a message…"
          className="max-h-40 min-h-11! resize-y rounded-xl! bg-background! py-2.5!"
        />
        <Button size={null}
          type="submit"
          disabled={sending || !body.trim()}
          className="size-11 shrink-0 rounded-xl"
          aria-label="Send message"
        >
          {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </section>
  );
}
