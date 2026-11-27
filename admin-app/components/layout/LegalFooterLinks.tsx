import Link from "next/link";

const links = [
  ["/terms", "Terms & Conditions"],
  ["/return-policy", "Return & Refund Policy"],
  ["/privacy", "Privacy Policy"],
] as const;

export function LegalFooterLinks() {
  return (
    <nav
      aria-label="Legal policies"
      className="mt-3 flex flex-col items-start gap-2.5 border-t border-primary-foreground/25 pt-3 text-xs text-muted leading-5"
    >
      {links.map(([href, label]) => (
        <Link
          key={href}
          className="underline-offset-4 hover:underline"
          href={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
