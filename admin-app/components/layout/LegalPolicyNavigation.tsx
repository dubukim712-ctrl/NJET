'use client';

import { SmartLink } from "@/components/ui/SmartLink";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const POLICY_LINKS = [
  { slug: 'terms', title: 'Terms & Conditions', href: '/terms' },
  { slug: 'return-policy', title: 'Return Policy', href: '/return-policy' },
  { slug: 'privacy', title: 'Privacy Policy', href: '/privacy' },
];

type LegalSectionLink = {
  id: string;
  title: string;
};

export function LegalPolicyNavigation({
  policySlug,
  policyTitle,
  sections,
}: {
  policySlug: string;
  policyTitle: string;
  sections: LegalSectionLink[];
}) {
  const router = useRouter();
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const sectionElements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    if (!sectionElements.length) return;

    const updateActiveSection = () => {
      const activationLine = window.innerHeight * 0.35;
      const activeSection = [...sectionElements]
        .reverse()
        .find((element) => element.getBoundingClientRect().top <= activationLine);
      setActiveSectionId(activeSection?.id ?? sectionElements[0].id);
    };
    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: '-96px 0px -65% 0px',
    });

    sectionElements.forEach((element) => observer.observe(element));
    updateActiveSection();
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    // Mobile policy links are hidden until the menu opens.
    for (const link of POLICY_LINKS) {
      if (link.slug !== policySlug) router.prefetch(link.href);
    }
  }, [policySlug, router]);

  const policyLinks = (
    <nav aria-label="Legal policies">
      <ul className="space-y-1">
        {POLICY_LINKS.map((link) => (
          <li key={link.slug}>
            <SmartLink
              href={link.href} prefetch={true}
              aria-current={policySlug === link.slug ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-md px-3 text-sm ${
                policySlug === link.slug
                  ? 'bg-primary/15 font-semibold text-foreground ring-1 ring-inset ring-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {link.title}
            </SmartLink>
            {policySlug === link.slug && (
              <nav
                aria-label={`${policyTitle} sections`}
                className="ml-3 mt-2 border-l pl-3"
              >
                <ol className="space-y-1">
                  {sections.map((section, index) => {
                    const active = activeSectionId === section.id;
                    return (
                      <li key={section.id}>
                        <SmartLink
                          href={`#${section.id}`}
                          aria-current={active ? 'location' : undefined}
                          className={`block rounded-md px-2 py-1.5 text-sm leading-5 ${
                            active
                              ? 'bg-primary/15 font-semibold text-foreground ring-1 ring-inset ring-primary'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {index + 1}. {section.title}
                        </SmartLink>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <details className="rounded-xl border bg-card p-4 sm:p-5 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">Legal</summary>
        <div className="pt-3">{policyLinks}</div>
      </details>
      <div className="hidden rounded-xl border bg-card p-4 sm:p-5 lg:block">
        <h2 className="text-lg font-semibold">Legal</h2>
        <div className="mt-4">{policyLinks}</div>
      </div>
    </>
  );
}
