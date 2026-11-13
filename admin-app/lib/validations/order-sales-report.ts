import { z } from 'zod';

const dateOnly = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Enter a valid calendar date.');

export const orderSalesReportFiltersSchema = z.object({
  startDate: dateOnly,
  endDate: dateOnly,
  compareMode: z.enum(['previous_period', 'last_year']),
  branchId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
  search: z.string().trim().max(120),
  page: z.number().int().min(1).max(10000),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
}).strict().superRefine(({ startDate, endDate }, context) => {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (start > end) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after start date.' });
  } else if ((end - start) / 86_400_000 > 3650) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'Choose a range of ten years or less.' });
  }
});

export const orderPaymentTransactionSchema = z.object({
  orderId: z.string().uuid(),
  transactionType: z.enum(['collection', 'refund']),
  paymentMethod: z.enum(['cash', 'online', 'home_credit', 'other']),
  paymentProvider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
  amountMinor: z.number().int().min(1).max(2147483647),
  isDownpayment: z.boolean(),
  reference: z.string().trim().max(120).nullable(),
  note: z.string().trim().max(500).nullable(),
}).strict().superRefine(({ paymentMethod, paymentProvider }, context) => {
  if (paymentMethod === 'online' && paymentProvider === null) {
    context.addIssue({
      code: 'custom',
      path: ['paymentProvider'],
      message: 'Choose an online payment provider.',
    });
  }
  if (paymentMethod !== 'online' && paymentProvider !== null) {
    context.addIssue({
      code: 'custom',
      path: ['paymentProvider'],
      message: 'A provider is only valid for online payments.',
    });
  }
});

const reportMetricsSchema = z.object({
  net_sales_minor: z.number().int(),
  ebikes_sold: z.number().int(),
  gross_profit_minor: z.number().int().nullable(),
  missing_cost_items: z.number().int(),
  collected_downpayments_minor: z.number().int(),
  pending_receivables_minor: z.number().int(),
}).strict();

export const orderSalesReportSummarySchema = z.object({
  current: reportMetricsSchema,
  comparison: reportMetricsSchema,
  sales_trend: z.array(z.object({
    bucket: z.string(),
    amount_minor: z.number().int(),
  }).strict()),
  categories: z.array(z.object({
    product_type: z.enum(['ebike', 'part', 'accessory']),
    quantity: z.number().int(),
    revenue_minor: z.number().int(),
  }).strict()),
  top_models: z.array(z.object({
    product_name: z.string(),
    variant_name: z.string(),
    sku: z.string(),
    quantity: z.number().int(),
    revenue_minor: z.number().int(),
  }).strict()),
  payment_breakdown: z.array(z.object({
    transaction_type: z.enum(['collection', 'refund', 'financing']),
    payment_method: z.enum(['cash', 'online', 'home_credit', 'other']),
    payment_provider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
    is_downpayment: z.boolean(),
    amount_minor: z.number().int(),
  }).strict()),
}).strict();

export const orderSalesReportOptionsSchema = z.object({
  branches: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).strict()),
  agents: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).strict()),
}).strict();

const reportOrderItemSchema = z.object({
  product_name: z.string(),
  product_type: z.enum(['ebike', 'part', 'accessory']),
  variant_name: z.string(),
  sku: z.string(),
  quantity: z.number().int(),
  unit_price_minor: z.number().int(),
  has_cost_snapshot: z.boolean(),
  line_total_minor: z.number().int(),
  serial_numbers: z.array(z.string()),
}).strict();

const reportPaymentSchema = z.object({
  transaction_type: z.enum(['collection', 'refund', 'financing']),
  payment_method: z.enum(['cash', 'online', 'home_credit', 'other']),
  payment_provider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
  is_downpayment: z.boolean(),
  amount_minor: z.number().int(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
  created_at: z.string(),
}).strict();

export const orderSalesReportRowsSchema = z.object({
  total: z.number().int().nonnegative(),
  rows: z.array(z.object({
    id: z.string().uuid(),
    order_number: z.string(),
    created_at: z.string(),
    completed_at: z.string().nullable(),
    customer_name: z.string(),
    contact_number: z.string(),
    branch_name: z.string(),
    sales_agent_id: z.string().uuid().nullable(),
    sales_agent_name: z.string(),
    order_source: z.enum(['online', 'walk_in']),
    fulfillment: z.enum(['pickup', 'delivery']),
    status: z.enum(['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'cancelled', 'expired', 'completed']),
    payment_method: z.enum(['cash', 'online', 'home_credit']),
    payment_provider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
    invoice_no: z.string().nullable(),
    total_minor: z.number().int(),
    amount_paid_minor: z.number().int(),
    financed_minor: z.number().int(),
    balance_due_minor: z.number().int(),
    items: z.array(reportOrderItemSchema),
    payments: z.array(reportPaymentSchema),
  }).strict()),
}).strict();

export const orderSalesReportExportSchema = z.object({
  total: z.number().int().nonnegative(),
  truncated: z.boolean(),
  rows: z.array(z.object({
    order_number: z.string(),
    invoice_no: z.string().nullable(),
    created_at: z.string(),
    completed_at: z.string().nullable(),
    customer_name: z.string(),
    branch_name: z.string(),
    sales_agent_name: z.string(),
    items: z.string(),
    payment_method: z.enum(['cash', 'online', 'home_credit']),
    payment_provider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
    total_minor: z.number().int(),
    amount_paid_minor: z.number().int(),
    balance_due_minor: z.number().int(),
    status: z.enum(['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'cancelled', 'expired', 'completed']),
  }).strict()),
}).strict();

export type OrderSalesReportFilters = z.infer<typeof orderSalesReportFiltersSchema>;
export type OrderPaymentTransactionInput = z.infer<typeof orderPaymentTransactionSchema>;
export type OrderSalesReportSummary = z.infer<typeof orderSalesReportSummarySchema>;
export type OrderSalesReportOptions = z.infer<typeof orderSalesReportOptionsSchema>;
export type OrderSalesReportRows = z.infer<typeof orderSalesReportRowsSchema>;
export type OrderSalesReportExport = z.infer<typeof orderSalesReportExportSchema>;
