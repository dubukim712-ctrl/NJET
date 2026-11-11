'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { UserNav } from '@/components/auth/UserNav';
import { Sidebar } from '@/components/layout/Sidebar';
import type { UserProfile } from '@/types/database';

interface DashboardShellProps {
  user: UserProfile | null;
  children: ReactNode;
}

export function DashboardShell({
  user,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="rounded-md p-2 transition-colors hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link href="/admin" className="text-lg font-bold">
            Admin App
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <UserNav user={user} />
          </div>
        </div>
      </header>

      <div className="flex">
        <Sidebar
          user={user}
          className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:flex"
        />

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-background shadow-xl">
              <div className="flex h-16 items-center justify-between border-b px-4">
                <span className="text-lg font-bold">Admin App</span>
                <button
                  type="button"
                  className="rounded-md p-2 hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <Sidebar
                user={user}
                className="flex h-full w-full border-r-0"
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 pb-16 sm:p-6 sm:pb-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
