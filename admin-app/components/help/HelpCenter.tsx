'use client';

import Link from 'next/link';
import { ChevronDown, MessageCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { customerHelpTopics, type HelpTopic } from '@/data/help/customer-help-topics';

const policyLinks = [
  ['/terms', 'Terms & Conditions'],
  ['/return-policy', 'Return & Refund Policy'],
  ['/privacy', 'Privacy Policy'],
] as const;

const customerQuickLinks = [
  { href: '/chat', label: 'Open live support chat' },
  { href: '/dashboard/orders', label: 'View my orders' },
  { href: '/dashboard/appointments/new', label: 'Book service' },
];

type HelpCenterProps = {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  topicGroups?: readonly HelpTopic[];
  quickLinks?: readonly { href: string; label: string }[];
  showPolicies?: boolean;
};

export function HelpCenter({
  title = 'Help Center',
  description = 'Find step-by-step guides for shopping, paying for an order, and booking service.',
  searchPlaceholder = 'Try payment proof or Home Credit',
  topicGroups = customerHelpTopics,
  quickLinks = customerQuickLinks,
  showPolicies = true,
}: HelpCenterProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const topics = topicGroups
    .filter((topic) => category === 'all' || topic.id === category)
    .map((topic) => ({
      ...topic,
      guides: topic.guides.filter((guide) => {
        const text = [topic.label, guide.title, guide.keywords, ...guide.steps].join(' ').toLowerCase();
        return words.every((word) => text.includes(word));
      }),
    }))
    .filter((topic) => topic.guides.length > 0);
  const guideCount = topics.reduce((total, topic) => total + topic.guides.length, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-6 sm:space-y-8">
      <header className="rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
        {quickLinks.length > 0 && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {quickLinks.map(({ href, label }, index) => (
              <Button key={href} asChild variant={index === 0 ? 'default' : 'outline'} className="min-h-11">
                <Link href={href}>{href === '/chat' && <MessageCircle aria-hidden="true" />}{label}</Link>
              </Button>
            ))}
          </div>
        )}
      </header>

      <section aria-label="Find a guide" className="space-y-3">
        <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 sm:p-5">
          <Input
            label="Search help guides"
            type="search"
            className="min-h-11"
            placeholder={searchPlaceholder}
            leadingIcon={<Search aria-hidden="true" />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Help category"
            className="min-h-11"
            value={category}
            onValueChange={setCategory}
          >
            <option value="all">All categories</option>
            {topicGroups.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
          </Select>
        </div>
        <p role="status" className="px-1 text-sm text-muted-foreground">
          {guideCount} {guideCount === 1 ? 'guide' : 'guides'} found
        </p>
      </section>

      {topics.length ? (
        <div className="space-y-6">
          {topics.map((topic) => (
            <section key={topic.id} aria-labelledby={`help-${topic.id}`} className="space-y-2">
              <h2 id={`help-${topic.id}`} className="text-lg font-semibold tracking-tight">{topic.label}</h2>
              {topic.guides.map((guide) => (
                <details key={guide.title} className="group rounded-xl border bg-card">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span>{guide.title}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <ol className="list-decimal space-y-2 border-t py-4 pr-4 pl-9 text-sm leading-6 sm:pr-5 sm:pl-10">
                    {guide.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </details>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <section className="rounded-xl border bg-card px-4 py-8 text-center">
          <h2 className="font-semibold">No matching guides</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or choose another category.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-11"
            onClick={() => { setSearch(''); setCategory('all'); }}
          >
            Clear filters
          </Button>
        </section>
      )}

      {showPolicies && (
        <nav aria-label="Help Center policies" className="flex flex-wrap gap-x-5 border-t pt-2">
          {policyLinks.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
