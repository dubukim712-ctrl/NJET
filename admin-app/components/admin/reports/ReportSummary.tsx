import { formatPhp } from '@/lib/commerce';
import type { OrderSalesReportSummary } from '@/lib/validations/order-sales-report';

function getTrend(current: number, previous: number, lowerIsBetter = false) {
  if (previous === 0) {
    return current === 0
      ? { label: 'No change', positive: true }
      : { label: 'New', positive: !lowerIsBetter };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  return {
    label: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`,
    positive: lowerIsBetter ? delta <= 0 : delta >= 0,
  };
}

export function ReportSummary({ summary }: { summary: OrderSalesReportSummary }) {
  const cards: {
    label: string;
    value: string;
    current: number | null;
    previous: number | null;
    note?: string;
    lowerIsBetter?: boolean;
  }[] = [
    {
      label: 'Net sales',
      value: formatPhp(summary.current.net_sales_minor),
      current: summary.current.net_sales_minor,
      previous: summary.comparison.net_sales_minor,
    },
    {
      label: 'E-bikes sold',
      value: summary.current.ebikes_sold.toLocaleString(),
      current: summary.current.ebikes_sold,
      previous: summary.comparison.ebikes_sold,
    },
    {
      label: 'Gross profit',
      value: summary.current.gross_profit_minor === null
        ? 'Incomplete cost data'
        : formatPhp(summary.current.gross_profit_minor),
      current: summary.current.gross_profit_minor,
      previous: summary.comparison.gross_profit_minor,
      note: summary.current.missing_cost_items > 0
        ? `${summary.current.missing_cost_items} completed order lines need a cost.`
        : undefined,
    },
    {
      label: 'Collected down payments',
      value: formatPhp(summary.current.collected_downpayments_minor),
      current: summary.current.collected_downpayments_minor,
      previous: summary.comparison.collected_downpayments_minor,
    },
    {
      label: 'Pending receivables',
      value: formatPhp(summary.current.pending_receivables_minor),
      current: summary.current.pending_receivables_minor,
      previous: summary.comparison.pending_receivables_minor,
      lowerIsBetter: true,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Sales key performance indicators">
      {cards.map((card, index) => {
        const trend = card.current === null || card.previous === null
          ? null
          : getTrend(card.current, card.previous, card.lowerIsBetter);
        return (
          <article
            key={card.label}
            className={`min-w-0 rounded-xl border bg-card p-4 shadow-sm ${index === 0 ? 'border-primary/40' : 'border-border'}`}
          >
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-3 break-words text-2xl font-semibold tracking-tight">{card.value}</p>
            <div className="mt-3 min-h-6">
              {trend && (
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  trend.positive
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
                }`}>
                  {trend.label} vs comparison
                </span>
              )}
              {card.note && (
                <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">{card.note}</p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
