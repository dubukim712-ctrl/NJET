import { formatPhp } from '@/lib/commerce';

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
      <p>Home Credit account: <strong>{details.accountNo}</strong></p>
      <p>
        Actual downpayment: {formatPhp(details.downpaymentMinor)}
        {' + '}financed balance: {formatPhp(totalMinor - details.downpaymentMinor)}
        {' = '}sales revenue: <strong>{formatPhp(totalMinor)}</strong>
      </p>
      <p>
        Terms: {details.termsMonths} months
        {' · '}Monthly payment: {formatPhp(details.monthlyPaymentMinor)}
      </p>
    </>
  );
}
