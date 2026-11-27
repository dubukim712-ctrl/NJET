'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { UnsendMessageDialog, type UnsendScope } from '@/components/support-chat/UnsendMessageDialog';
import { shouldShowTimeDivider } from '@/lib/support-chat/message-time';
import type { SupportChatMessage } from '@/types/support-chat';

interface ChatMessageListProps {
  messages: SupportChatMessage[];
  sentMessageId: string | null;
  mode: 'customer' | 'staff';
  userId: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onDelete: (messageId: string, scope: UnsendScope) => void;
}

function relativeAge(value: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString();
}

export function ChatMessageList({
  messages,
  sentMessageId,
  mode,
  userId,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onDelete,
}: ChatMessageListProps) {
  const [now, setNow] = useState(() => Date.now());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shownTimestampId, setShownTimestampId] = useState<string | null>(null);
  const [unsendTarget, setUnsendTarget] = useState<{ id: string; canUnsendForEveryone: boolean } | null>(null);
  const [unsendScope, setUnsendScope] = useState<UnsendScope>('for_everyone');
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastScrolledSend = useRef<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTriggered = useRef(false);
  const latestId = messages[messages.length - 1]?.id;
  const visibleSentId = sentMessageId && messages.some(({ id }) => id === sentMessageId)
    ? sentMessageId
    : null;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    const sent = visibleSentId !== null && visibleSentId !== lastScrolledSend.current;
    if (!list || (!sent && !nearBottom.current)) return;

    lastScrolledSend.current = visibleSentId;
    nearBottom.current = true;
    list.scrollTop = list.scrollHeight;
  }, [latestId, visibleSentId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new ResizeObserver(() => {
      if (nearBottom.current) list.scrollTop = list.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const clearHoldTimer = () => {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const beginHold = (messageId: string, pointerType: string) => {
    holdTriggered.current = false;
    if (pointerType !== 'touch') return;
    clearHoldTimer();
    holdTimer.current = setTimeout(() => {
      holdTriggered.current = true;
      setOpenMenuId(messageId);
    }, 500);
  };

  const showUnsendDialog = (message: SupportChatMessage, mine: boolean) => {
    const canUnsendForEveryone = mine && !message.deleted_at && !message.external_message_id;
    setUnsendScope(canUnsendForEveryone ? 'for_everyone' : 'for_you');
    setUnsendTarget({ id: message.id, canUnsendForEveryone });
  };

  const confirmUnsend = () => {
    if (!unsendTarget) return;
    onDelete(unsendTarget.id, unsendScope);
    setUnsendTarget(null);
  };

  return (
    <div
      ref={listRef}
      onScroll={({ currentTarget: list }) => {
        nearBottom.current = list.scrollHeight - list.clientHeight - list.scrollTop <= 120;
      }}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5"
    >
      {hasOlder && (
        <Button variant={null} size={null}
          type="button"
          onClick={onLoadOlder}
          disabled={loadingOlder}
          className="mx-auto mb-4 min-h-10 rounded-full border px-4 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-60"
        >
          {loadingOlder ? 'Loading…' : 'Load earlier messages'}
        </Button>
      )}
      {messages.length === 0 ? (
        <div className="m-auto max-w-xs py-12 text-center">
          <p className="font-medium">Your conversation starts here.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a message and our team will get back to you.
          </p>
        </div>
      ) : (
        <ol className="mt-auto space-y-4" aria-live="polite">
          {messages.map((message, index) => {
            const mine =
              mode === 'customer'
                ? message.sender_role === 'customer'
                : message.sender_role === 'staff' &&
                  message.sender_user_id === userId;
            const previous = messages[index - 1];
            const showSenderLabel =
              !previous ||
              previous.sender_role !== message.sender_role ||
              previous.sender_user_id !== message.sender_user_id;
            const showTimeDivider = shouldShowTimeDivider(
              message.created_at,
              previous?.created_at ?? null,
              index === 0 && !hasOlder,
            );
            const menu = (
              <DropdownMenu
                open={openMenuId === message.id}
                onOpenChange={(open) => setOpenMenuId(open ? message.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant={null} size={null}
                    type="button"
                    aria-label="More message actions"
                    title="More message actions"
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:pointer-fine:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 data-[state=open]:opacity-100"
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={mine ? 'end' : 'start'} sideOffset={4}>
                  <DropdownMenuItem className="min-h-11" onSelect={() => showUnsendDialog(message, mine)}>
                    Unsend
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );

            return (
              <li
                key={message.id}
                className="flex flex-col"
              >
                {showTimeDivider && (
                  <p className="mb-3 self-center rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                    <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString()}>
                      {new Date(message.created_at).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </p>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <article className="group min-w-0 max-w-[calc(88vw-2.5rem)] sm:max-w-[min(76vw,38rem)]">
                    {showSenderLabel && (
                      <p className={`mb-1 px-1 text-xs font-medium ${mine ? 'text-right text-muted-foreground' : 'text-muted-foreground'}`}>
                        {mine ? 'You' : message.sender_name}
                      </p>
                    )}
                    <div className={`flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {mine && menu}
                      <Button variant={null} size={null}
                        type="button"
                        aria-label={shownTimestampId === message.id ? 'Hide message timestamp' : 'Show message timestamp'}
                        aria-expanded={shownTimestampId === message.id}
                        onPointerDown={(event) => beginHold(message.id, event.pointerType)}
                        onPointerUp={clearHoldTimer}
                        onPointerCancel={clearHoldTimer}
                        onPointerMove={clearHoldTimer}
                        onClick={() => {
                          if (holdTriggered.current) {
                            holdTriggered.current = false;
                            return;
                          }
                          setShownTimestampId((current) => current === message.id ? null : message.id);
                        }}
                        onContextMenu={(event) => {
                          if (window.matchMedia('(max-width: 1023px)').matches) {
                            event.preventDefault();
                            setOpenMenuId(message.id);
                          }
                        }}
                        className={`block w-fit min-w-0 max-w-full select-none whitespace-normal rounded-2xl px-4 py-3 text-left font-normal ${mine ? 'rounded-br-sm bg-accent text-accent-foreground' : 'rounded-bl-sm border bg-card text-card-foreground'}`}
                      >
                        {message.deleted_at ? (
                          <span className="block text-sm italic opacity-75">Message deleted</span>
                        ) : (
                          <span className="block whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6">
                            {message.body}
                          </span>
                        )}
                      </Button>
                      {!mine && menu}
                    </div>
                    {shownTimestampId === message.id && (
                      <div className={`mt-1 px-1 text-[11px] text-muted-foreground ${mine ? 'text-right' : ''}`}>
                        <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString()}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {relativeAge(message.created_at, now)}
                        </time>
                      </div>
                    )}
                  </article>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <UnsendMessageDialog
        open={unsendTarget !== null}
        canUnsendForEveryone={unsendTarget?.canUnsendForEveryone ?? false}
        scope={unsendScope}
        onScopeChange={setUnsendScope}
        onConfirm={confirmUnsend}
        onClose={() => setUnsendTarget(null)}
      />
    </div>
  );
}
