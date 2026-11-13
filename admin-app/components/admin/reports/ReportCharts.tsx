'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPhp } from '@/lib/commerce';
import type { OrderSalesReportSummary } from '@/lib/validations/order-sales-report';

const COLORS = ['#0f766e', '#ea580c', '#2563eb', '#9333ea', '#ca8a04'];

function formatBucket(bucket: string) {
  const date = new Date(`${bucket}+08:00`);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    ...(bucket.includes('T00:00:00') ? {} : { hour: 'numeric' }),
  }).format(date);
}

function productTypeLabel(value: string) {
  return value === 'ebike' ? 'E-bikes' : value === 'part' ? 'Parts' : 'Accessories';
}

function formatAxisMoney(value: number) {
  const pesos = value / 100;
  return pesos >= 1000 ? `₱${Math.round(pesos / 1000)}k` : `₱${Math.round(pesos)}`;
}

function paymentLabel(method: string, provider: string | null) {
  if (method === 'online') {
    return provider === 'bank_transfer'
      ? 'Bank transfer'
      : `${provider === 'gcash' ? 'GCash' : 'Card'} online`;
  }
  if (method === 'home_credit') return 'Home Credit financing';
  if (method === 'other') return 'Other / unspecified';
  return 'Cash';
}

export function ReportCharts({ summary }: { summary: OrderSalesReportSummary }) {
  const categories = summary.categories.map((item) => ({
    ...item,
    label: productTypeLabel(item.product_type),
  }));
  const payments = summary.payment_breakdown.map((item) => ({
    ...item,
    label: `${item.is_downpayment ? 'Downpayment · ' : ''}${item.transaction_type === 'refund' ? 'Refund · ' : item.transaction_type === 'financing' ? 'Financed · ' : ''}${paymentLabel(item.payment_method, item.payment_provider)}`,
  }));

  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Sales trend</h2>
          <p className="text-sm text-muted-foreground">Completed orders, net of recorded refunds.</p>
        </div>
        {summary.sales_trend.length === 0 ? (
          <p className="grid h-64 place-items-center text-sm text-muted-foreground">No completed sales in this period.</p>
        ) : (
          <div className="h-64" role="img" aria-label="Sales trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.sales_trend} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bucket" tickFormatter={formatBucket} minTickGap={24} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  labelFormatter={(label) => formatBucket(String(label))}
                  formatter={(value) => [formatPhp(Number(value ?? 0)), 'Net sales']}
                />
                <Line type="monotone" dataKey="amount_minor" name="Net sales" stroke="#0f766e" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Sales mix</h2>
          <p className="text-sm text-muted-foreground">Completed product revenue by recorded product type.</p>
        </div>
        {categories.length === 0 ? (
          <p className="grid h-64 place-items-center text-sm text-muted-foreground">No product sales in this period.</p>
        ) : (
          <div className="h-64" role="img" aria-label="Product revenue breakdown chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="revenue_minor" nameKey="label" innerRadius={55} outerRadius={88} paddingAngle={3}>
                  {categories.map((entry, index) => (
                    <Cell key={entry.product_type} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatPhp(Number(value ?? 0))} />
                <Legend verticalAlign="bottom" height={28} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Top e-bike models</h2>
          <p className="text-sm text-muted-foreground">Ranked by completed units sold.</p>
        </div>
        {summary.top_models.length === 0 ? (
          <p className="grid h-56 place-items-center text-sm text-muted-foreground">No e-bike sales in this period.</p>
        ) : (
          <div className="h-56" role="img" aria-label="Top e-bike model ranking chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.top_models} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="product_name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => String(value).slice(0, 18)}
                />
                <Tooltip formatter={(value) => [Number(value ?? 0), 'Units']} />
                <Bar dataKey="quantity" name="Units sold" fill="#ea580c" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Payments and financing</h2>
          <p className="text-sm text-muted-foreground">Recorded collections, refunds, and financed amounts for these orders.</p>
        </div>
        {payments.length === 0 ? (
          <p className="grid h-56 place-items-center text-sm text-muted-foreground">No payment events recorded for this period.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((payment) => (
              <li key={`${payment.transaction_type}-${payment.payment_method}-${payment.payment_provider}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">{payment.label}</span>
                <span className="shrink-0 font-medium">{formatPhp(payment.amount_minor)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
