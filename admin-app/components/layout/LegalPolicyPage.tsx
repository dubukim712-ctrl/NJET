import { LegalPolicyNavigation } from '@/components/layout/LegalPolicyNavigation';
import type { LegalPolicy } from '@/data/legal-policies';

export function LegalPolicyUnavailable({ message }: { message: string }) {
  return (
    <section
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"
      role="alert"
    >
      <h1 className="font-semibold">Policy unavailable</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </section>
  );
}

export function LegalPolicyPage({ policy }: { policy: LegalPolicy }) {
  return (
    <div className="mx-auto max-w-6xl py-5 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <aside className="h-fit lg:sticky lg:top-24">
          <LegalPolicyNavigation
            policySlug={policy.slug}
            policyTitle={policy.title}
            sections={policy.sections.map(({ id, title }) => ({ id, title }))}
          />
        </aside>

        <article className="min-w-0">
          <header className="border-b pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Noel &amp; Jane E-bike Trading
            </p>
            <h1 className="mt-2 text-3xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">
              {policy.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Version {policy.version} · Last updated {policy.lastUpdated}
            </p>
            <p className="mt-6 max-w-3xl text-base leading-7 text-foreground">
              {policy.intro}
            </p>
          </header>

          <section aria-labelledby="policy-summary" className="py-6">
            <h2 id="policy-summary" className="sr-only">Policy summary</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              This document is made up of the following sections:
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="w-[38%] px-3 py-3 font-semibold sm:px-5">
                      Section
                    </th>
                    <th className="px-3 py-3 font-semibold sm:px-5">
                      What it covers
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {policy.sections.map((section, index) => (
                    <tr key={section.id} className="border-t">
                      <th scope="row" className="break-words bg-muted/40 px-3 py-3 font-medium sm:px-5">
                        {index + 1}. {section.title}
                      </th>
                      <td className="break-words px-3 py-3 leading-6 sm:px-5">
                        {section.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="divide-y">
            {policy.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 py-6"
              >
                <h2 className="text-xl font-semibold tracking-tight">
                  {index + 1}. {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-3 max-w-3xl text-sm leading-7 text-foreground/90">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-foreground/90">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <p className="mt-2 rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm leading-6 text-foreground">
            For help with an order or a policy question, use the current contact
            details shown in the site footer or on your sales documents.
          </p>
        </article>
      </div>
    </div>
  );
}
