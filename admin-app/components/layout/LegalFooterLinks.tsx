import Link from "next/link";

const links = [
  ["/terms", "Terms & Conditions"],
  ["/return-policy", "Return & Refund Policy"],
  ["/privacy", "Privacy Policy"],
] as const;

export function LegalFooterLinks() {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
        Legal
      </h3>
      <nav aria-label="Legal policies" className="mt-4 flex flex-col items-start gap-3 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} className="underline-offset-4 hover:underline" href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
