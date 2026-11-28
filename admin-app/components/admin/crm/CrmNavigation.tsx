import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from '@/components/ui/Button';

export function CrmNavigation({ current }: { current: 'customers' | 'follow-ups' }) {
  return (
    <nav aria-label="Customer CRM" className="flex flex-wrap gap-2">
      {[
        { id: 'customers', href: '/admin/crm', label: 'Customers' },
        { id: 'follow-ups', href: '/admin/crm/follow-ups', label: 'Follow-ups' },
      ].map(({ id, href, label }) => (
        <Button key={id} asChild variant={current === id ? 'default' : 'outline'} className="min-h-11 rounded-full">
          <SmartLink prefetch={true} href={href} aria-current={current === id ? 'page' : undefined}>{label}</SmartLink>
        </Button>
      ))}
    </nav>
  );
}
