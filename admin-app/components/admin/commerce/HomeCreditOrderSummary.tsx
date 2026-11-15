import { formatPhp } from "@/lib/commerce";

export function HomeCreditOrderSummary({
  details,
  totalMinor,
}: {
  details: {
    accountNo: string;
    downpaymentMinor: number;
    termsMonths: number;
    monthlyPaymentMinor: number;
  };
  totalMinor: number;
}) {
  return (
    <>
      <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
        Home Credit account
        <span className="text-foreground font-bold text-right">
          {details.accountNo}
        </span>
      </p>
      <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
        Actual downpayment
        <span className="text-foreground font-bold text-right">
          {formatPhp(details.downpaymentMinor)}
        </span>
      </p>
      <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
        Financed balance
        <span className="text-foreground font-bold text-right">
          {formatPhp(totalMinor - details.downpaymentMinor)}
        </span>
      </p>
      <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
        Sales revenue
        <span className="text-foreground font-bold text-right">
          {formatPhp(totalMinor)}
        </span>
      </p>
      <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
        Terms
        <span className="text-foreground font-bold text-right">
          {details.termsMonths} months
        </span>
      </p>
      <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
        Monthly payment
        <span className="text-foreground font-bold text-right">
          {formatPhp(details.monthlyPaymentMinor)}
        </span>
      </p>
    </>
  );
}
