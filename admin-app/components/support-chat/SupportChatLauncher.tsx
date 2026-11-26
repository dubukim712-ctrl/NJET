'use client';

import { useState, useTransition } from 'react';
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

const channelClass = 'min-h-12 cursor-pointer gap-3 rounded-xl px-3 font-medium focus:bg-primary/10 focus:text-foreground';

export function SupportChatLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checking, startTransition] = useTransition();

  if (pathname === '/chat') return null;

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

  return (
    <DropdownMenu open={open} onOpenChange={toggleChannels} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size={null}
          type="button"
          aria-busy={checking}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 min-h-12 gap-2 rounded-full px-4 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5 lg:bottom-6 lg:right-6"
        >
          {checking ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            : <MessageCircle className="size-5" aria-hidden="true" />}
          Chat with us
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={10}
        collisionPadding={16}
        aria-label="Choose a chat channel"
        className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl border-primary/20 bg-card p-2 text-card-foreground shadow-xl"
      >
        <DropdownMenuItem asChild className={channelClass}>
          <Link href="/chat" prefetch={false}>
            <MessageCircle className="size-5 text-primary" aria-hidden="true" />
            Chat on Website
          </Link>
        </DropdownMenuItem>
        {messengerUrl ? (
          <DropdownMenuItem asChild className={channelClass}>
            <a href={messengerUrl} target="_blank" rel="noopener noreferrer">
              <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
              Continue on Messenger
              <ArrowUpRight className="ml-auto size-4 text-primary" aria-hidden="true" />
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
  );
}
