'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

export function SupportChatLauncher() {
  const pathname = usePathname();
  if (pathname === '/chat') return null;

  return (
    <Link
      href="/chat"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:bottom-6 lg:right-6"
      aria-label="Chat with NJET support"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      <span>Chat with us</span>
    </Link>
  );
}
