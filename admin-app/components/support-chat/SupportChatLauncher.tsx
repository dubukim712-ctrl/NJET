'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { openSupportChatEvent } from '@/lib/support-chat/open-launcher';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, LoaderCircle, MessageCircle, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { hasOpenWebChatAction } from '@/data/actions/support-chat-session';
import { messengerUrl } from '@/lib/support-chat/messenger-link';

const channelClass = 'min-h-12 cursor-pointer gap-3 rounded-xl px-3 font-medium focus:bg-accent focus:text-foreground';

const subscribeToPortal = () => () => undefined;

export function SupportChatLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const launcherRef = useRef<HTMLDivElement>(null);
  const [overFooter, setOverFooter] = useState(false);
  const [actionOffset, setActionOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [checking, startTransition] = useTransition();

  const portal = useSyncExternalStore(subscribeToPortal, () => document.body, () => null);

  useEffect(() => {
    const openChannels = () => setOpen(true);
    window.addEventListener(openSupportChatEvent, openChannels);
    return () => window.removeEventListener(openSupportChatEvent, openChannels);
  }, []);

  useEffect(() => {
    const launcher = launcherRef.current;
    if (!launcher) return;

    const shell = document.getElementById('storefront-content');
    let frame = 0;
    const checkOverlap = () => {
      frame = 0;
      const button = launcher.getBoundingClientRect();
      const footer = document.querySelector('[data-chat-footer]')?.getBoundingClientRect();
      setOverFooter(Boolean(footer && button.bottom > footer.top && button.top < footer.bottom));

      let offset = 0;
      for (const action of document.querySelectorAll('[data-chat-clearance]')) {
        const area = action.getBoundingClientRect();
        if (area.width > 0 && area.height > 0 &&
          button.left < area.right && button.right > area.left &&
          button.top < area.bottom && button.bottom > area.top) {
          offset = Math.max(offset, Math.ceil(button.bottom - area.top + 8));
        }
      }
      setActionOffset(offset);
    };
    const scheduleCheck = () => {
      if (!frame) frame = window.requestAnimationFrame(checkOverlap);
    };

    scheduleCheck();
    window.addEventListener('scroll', scheduleCheck, { capture: true, passive: true });
    window.addEventListener('resize', scheduleCheck);
    window.visualViewport?.addEventListener('resize', scheduleCheck);
    const resize = new ResizeObserver(scheduleCheck);
    resize.observe(launcher);
    if (shell) resize.observe(shell);
    const content = new MutationObserver(scheduleCheck);
    if (shell) content.observe(shell, { childList: true, subtree: true });
    return () => {
      window.removeEventListener('scroll', scheduleCheck, true);
      window.removeEventListener('resize', scheduleCheck);
      window.visualViewport?.removeEventListener('resize', scheduleCheck);
      resize.disconnect();
      content.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [portal, pathname]);

  if (!portal || pathname === '/chat') return null;

  function toggleChannels(nextOpen: boolean) {
    if (!nextOpen) {
      setOpen(false);
      return;
    }
    if (checking) return;

    startTransition(async () => {
      if (await hasOpenWebChatAction().catch(() => false)) router.push('/chat');
      else setOpen(true);
    });
  }

  return createPortal(
    <div
      ref={launcherRef}
      className={`fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 lg:right-6 lg:bottom-6 ${overFooter && !open ? 'invisible focus-within:visible' : ''}`}
    >
      <DropdownMenu open={open} onOpenChange={toggleChannels} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant={null} size={null}
            type="button"
            aria-label="Chat with us"
            aria-busy={checking}
            style={{ translate: actionOffset ? "0 " + -actionOffset + "px" : undefined }}
            className="pointer-events-auto size-12 gap-2 rounded-full bg-[#264653] text-base font-semibold text-[#f4ede4] shadow-lg hover:bg-[#315765] transition-transform motion-safe:hover:-translate-y-0.5 lg:w-auto lg:px-4"
          >
            {checking ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
              : <MessageCircle className="size-5" aria-hidden="true" />}
            <span className="hidden lg:inline">Chat with us</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          aria-label="Choose a chat channel"
          className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-card p-2 text-card-foreground shadow-xl"
        >
          <DropdownMenuItem asChild className={channelClass}>
            <Link href="/chat">
              <MessageCircle className="size-5 text-foreground" aria-hidden="true" />
              Chat on Website
            </Link>
          </DropdownMenuItem>
          {messengerUrl ? (
            <DropdownMenuItem asChild className={channelClass}>
              <a href={messengerUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquareText className="size-5 text-foreground" aria-hidden="true" />
                Continue on Messenger
                <ArrowUpRight className="ml-auto size-4 text-foreground" aria-hidden="true" />
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className={channelClass}>
              <MessageSquareText className="size-5" aria-hidden="true" />
              Continue on Messenger
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>,
    portal,
  );
}
