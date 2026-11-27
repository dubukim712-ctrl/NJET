import Image from 'next/image';
import Link from 'next/link';
import { PrintReceiptButton } from '@/components/commerce/PrintReceiptButton';
import { formatPhp } from '@/lib/commerce';
import type { SalesReceiptData } from '@/data/commerce/sales-receipt-data';

export function PrintableSalesReceipt({ receipt, logoUrl, backHref }: {
  receipt: SalesReceiptData; logoUrl: string | null; backHref: string;
}) {
  const { business, homeCredit } = receipt;
  const metadata = [
    ['Receipt number', receipt.receiptNumber],
    ['Order number', receipt.orderNumber],
    ...(receipt.invoiceNo ? [['Sales Invoice number', receipt.invoiceNo]] : []),
    ['Issued (Manila time)', receipt.issuedAt],
    ['Fulfillment', receipt.fulfillment],
    ['Payment method', receipt.paymentMethod],
    ['Payment status', receipt.paymentStatus],
  ];
  const totals = [
    ['Subtotal', receipt.subtotal],
    [receipt.promotions.length ? `Discounts (${receipt.promotions.join(', ')})` : 'Discounts', -receipt.discount],
    ['Delivery fee', receipt.deliveryFee],
    ['Total amount', receipt.total],
    ['Amount paid', receipt.amountPaid],
    ['Balance due', receipt.balanceDue],
  ] as const;

  return (
    <>
      <style>{`
        @media print {
          @page { size: auto; margin: 12mm; }
          body:has(.sales-receipt) :not(.sales-receipt, .sales-receipt *, :has(.sales-receipt)) {
            display: none !important;
          }
          html:has(.sales-receipt), body:has(.sales-receipt), body :has(.sales-receipt) {
            display: block !important; position: static !important; background: white !important;
            overflow: visible !important; min-height: 0 !important; height: auto !important;
            width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important;
          }
          .sales-receipt { color: #000 !important; background: white !important; max-width: none !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
          .sales-receipt thead { display: table-header-group; }
          .sales-receipt tr, .receipt-signatures { break-inside: avoid; }
        }
      `}</style>
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-medium text-primary underline" href={backHref}>Back to Order</Link>
        <PrintReceiptButton />
      </div>
      <article className="sales-receipt mx-auto max-w-3xl space-y-5 rounded-lg border border-neutral-300 bg-white p-4 text-black sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-300 pb-4">
          <div className="flex items-start gap-3">
            {logoUrl ? <Image src={logoUrl} alt="" width={48} height={48} unoptimized className="size-12 object-contain" /> :
              <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-bold">NJET</span>}
            <div>
              <p className="font-bold">{business.business_name}</p>
              <p className="text-sm">{receipt.branchName}</p>
              <p className="text-sm">{receipt.branchAddress || business.address}</p>
              <p className="text-sm">{[business.phone, business.email].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <h1 className="text-xl font-bold">Sales Receipt</h1>
        </header>

        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {metadata.map(([label, value]) => (
              <div className="contents" key={label}><dt className="font-medium">{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <section>
            <h2 className="font-semibold">Customer details</h2>
            <p>{receipt.customerName}</p>
            <p>{receipt.contactNumber}</p>
            {receipt.address && <p>{receipt.address}</p>}
          </section>
        </div>

        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead className="border-y border-neutral-400">
            <tr><th scope="col" className="py-2">Product / SKU</th><th scope="col" className="text-right">Qty</th>
              <th scope="col" className="pl-2 text-right">Unit price</th><th scope="col" className="pl-2 text-right">Line total</th></tr>
          </thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-300 align-top">
                <td className="py-2 pr-2">
                  <p className="font-medium">{item.product_name} · {item.variant_name}</p>
                  <p className="break-all">SKU {item.sku}</p>
                  {item.units.map((unit, index) => (
                    <p key={index} className="break-words text-xs">
                      Serial Number {unit.serial_number ?? 'Unavailable'} · Motor Number {unit.motor_number ?? 'Unavailable'}
                    </p>
                  ))}
                  {item.product_type === 'ebike' && item.units.length < item.quantity && (
                    <p className="text-xs">Serial and motor records are incomplete for this line.</p>
                  )}
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 pl-2 text-right">{formatPhp(item.unit_price_minor)}</td>
                <td className="py-2 pl-2 text-right">{formatPhp(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          {totals.map(([label, value]) => (
            <div key={label} className={`contents ${label === 'Total amount' ? 'font-bold' : ''}`}>
              <dt>{label}</dt><dd className="text-right">{formatPhp(value || 0)}</dd>
            </div>
          ))}
        </dl>
        {homeCredit && (
          <section className="border-t border-neutral-300 pt-3 text-sm">
            <h2 className="font-semibold">Home Credit</h2>
            <p>Account {homeCredit.home_credit_acc_no} · {homeCredit.terms_months} months</p>
            <p>Downpayment {formatPhp(homeCredit.downpayment_minor)} · Monthly payment {formatPhp(homeCredit.monthly_payment_minor)}</p>
          </section>
        )}
        {!homeCredit && receipt.homeCreditDownpayment !== null && (
          <section className="border-t border-neutral-300 pt-3 text-sm">
            <h2 className="font-semibold">Home Credit</h2>
            <p>Downpayment {formatPhp(receipt.homeCreditDownpayment)}</p>
            <p>Contact the branch for the financing agreement details.</p>
          </section>
        )}
        <footer className="receipt-signatures space-y-3 border-t border-neutral-300 pt-4 text-xs">
          <div className="grid grid-cols-2 gap-4 pt-6 text-center">
            <p className="border-t border-neutral-500 pt-2">Issued by (Authorized Representative)</p>
            <p className="border-t border-neutral-500 pt-2">Received by (Customer Signature)</p>
          </div>
          <p>Thank you for choosing NJET. Please keep this receipt for warranty and service reference. This document serves as an order acknowledgment receipt.</p>
        </footer>
      </article>
    </>
  );
}
