import { Bike, CalendarDays, FileCheck } from "lucide-react";
import { PaymentOptionBadges } from "@/components/shop/PaymentOptionBadges";

const benefits = [
  {
    title: "Fast & Easy Approval",
    description: "Quick, hassle-free application process.",
    icon: FileCheck,
  },
  {
    title: "Affordable Monthly Installments",
    description: "Flexible payment terms tailored to your budget.",
    icon: CalendarDays,
  },
  {
    title: "Wide Selection of Quality E-Bikes",
    description: "Reliable models ready for daily commuting and family rides.",
    icon: Bike,
  },
];

export function StorefrontBenefitsSection() {
  return (
    <section aria-labelledby="storefront-benefits-title" className="space-y-4">
      <h2 id="storefront-benefits-title" className="text-xs font-semibold tracking-wider text-accent-foreground">
        WHY CHOOSE NJET
      </h2>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
        {benefits.map(({ title, description, icon: Icon }) => (
          <li key={title} className="flex items-start gap-3 rounded-xl border bg-card p-3 sm:p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-success">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold leading-5">{title}</h3>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3">
        <h3 className="text-sm font-semibold text-foreground">Accepted payment options</h3>
        <PaymentOptionBadges />
      </div>
    </section>
  );
}
