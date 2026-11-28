import { SmartLink } from "@/components/ui/SmartLink";

const links = [
  ["/terms", "Terms & Conditions"],
  ["/return-policy", "Return Policy"],
  ["/privacy", "Privacy Policy"],
] as const;

export function LegalFooterLinks() {
  return (
    <nav
      aria-label="Legal policies"
      className="mt-3 flex flex-col items-start gap-2.5 border-t border-white/20 pt-3 text-xs leading-5"
    >
      {links.map(([href, label]) => (
        <SmartLink
          key={href}
          className="underline-offset-4 hover:underline"
          href={href} prefetch={true}
        >
          {label}
        </SmartLink>
      ))}
    </nav>
  );
}
