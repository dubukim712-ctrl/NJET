'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  orderPaymentTransactionSchema,
  orderSalesReportExportSchema,
  orderSalesReportFiltersSchema,
  orderSalesReportOptionsSchema,
  orderSalesReportRowsSchema,
  orderSalesReportSummarySchema,
} from '@/lib/validations/order-sales-report';

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function shiftYear(date: string, years: number) {
  const [year, month, day] = date.split('-').map(Number);
  const targetYear = year + years;
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return `${targetYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function manilaMidnight(date: string) {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

function getComparisonDates(
  startDate: string,
  endDate: string,
  compareMode: 'previous_period' | 'last_year'
) {
  if (compareMode === 'last_year') {
    return {
      startDate: shiftYear(startDate, -1),
      endDate: shiftYear(endDate, -1),
    };
  }
  const length = Math.round(
    (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`))
      / 86_400_000
  ) + 1;
  const previousEnd = addDays(startDate, -1);
  return { startDate: addDays(previousEnd, -(length - 1)), endDate: previousEnd };
}

export async function getOrderSalesReportOptionsAction() {
  const { supabase } = await requirePermission(PERMISSIONS.ordersRead, '/admin/reports');
  try {
    const { data, error } = await supabase.rpc('admin_order_sales_report_options');
    if (error) {
      console.error('Could not load order sales report filters.', error);
      return { success: false, error: 'Report filters could not be loaded.' } as const;
    }
    const parsed = orderSalesReportOptionsSchema.safeParse(data);
    if (!parsed.success) {
      console.error('Order sales report filters did not match the expected contract.', parsed.error);
      return { success: false, error: 'Report filters could not be loaded.' } as const;
    }
    return { success: true, data: parsed.data } as const;
  } catch (error) {
    console.error('Could not load order sales report filters.', error);
    return { success: false, error: 'Report filters could not be loaded.' } as const;
  }
}

export async function getOrderSalesReportAction(payload: unknown) {
  const { supabase } = await requirePermission(PERMISSIONS.ordersRead, '/admin/reports');
  const parsed = orderSalesReportFiltersSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Review the report dates and filters.' } as const;
  }

  const input = parsed.data;
  const comparison = getComparisonDates(input.startDate, input.endDate, input.compareMode);
  const startAt = manilaMidnight(input.startDate);
  const endAt = manilaMidnight(addDays(input.endDate, 1));
  const comparisonStartAt = manilaMidnight(comparison.startDate);
  const comparisonEndAt = manilaMidnight(addDays(comparison.endDate, 1));
  const durationDays = Math.round(
    (Date.parse(`${input.endDate}T00:00:00.000Z`) - Date.parse(`${input.startDate}T00:00:00.000Z`))
      / 86_400_000
  ) + 1;
  const granularity: 'hour' | 'day' | 'month' =
    durationDays === 1 ? 'hour' : durationDays > 31 ? 'month' : 'day';

  try {
    const [summaryResult, rowsResult] = await Promise.all([
      supabase.rpc('admin_order_sales_report', {
        p_start_at: startAt,
        p_end_at: endAt,
        p_compare_start_at: comparisonStartAt,
        p_compare_end_at: comparisonEndAt,
        p_branch_id: input.branchId,
        p_agent_id: input.agentId,
        p_granularity: granularity,
      }),
      supabase.rpc('admin_order_sales_report_rows', {
        p_start_at: startAt,
        p_end_at: endAt,
        p_branch_id: input.branchId,
        p_agent_id: input.agentId,
        p_search: input.search || null,
        p_page: input.page,
        p_page_size: input.pageSize,
      }),
    ]);

    if (summaryResult.error || rowsResult.error) {
      console.error('Could not load order sales report.', summaryResult.error ?? rowsResult.error);
      return { success: false, error: 'The sales report could not be loaded.' } as const;
    }

    const summary = orderSalesReportSummarySchema.safeParse(summaryResult.data);
    const rows = orderSalesReportRowsSchema.safeParse(rowsResult.data);
    if (!summary.success || !rows.success) {
      console.error('Order sales report did not match the expected contract.', {
        summary: summary.success ? null : summary.error,
        rows: rows.success ? null : rows.error,
      });
      return { success: false, error: 'The sales report returned invalid data.' } as const;
    }
    return { success: true, data: { summary: summary.data, ledger: rows.data } } as const;
  } catch (error) {
    console.error('Could not load order sales report.', error);
    return { success: false, error: 'The sales report could not be loaded.' } as const;
  }
}

export async function recordOrderPaymentTransactionAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/reports');
  const parsed = orderPaymentTransactionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the payment details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  try {
    const { data, error } = await supabase.rpc('record_order_payment_transaction', {
      p_order_id: input.orderId,
      p_transaction_type: input.transactionType,
      p_payment_method: input.paymentMethod,
      p_payment_provider: input.paymentProvider,
      p_amount_minor: input.amountMinor,
      p_reference: input.reference,
      p_note: input.note,
      p_is_downpayment: input.isDownpayment,
    });
    if (error || !data) {
      console.error('Could not record an order payment transaction.', error);
      return { success: false, error: error?.message ?? 'Could not record the payment.' };
    }
    revalidatePath('/admin/reports');
    revalidatePath('/admin/orders');
    return { success: true, data: { id: data } };
  } catch (error) {
    console.error('Could not record an order payment transaction.', error);
    return { success: false, error: 'Could not record the payment. Please try again.' };
  }
}

function csvCell(value: string | number) {
  const text = String(value);
  const safe = typeof value === 'string' && /^[\u0000-\u0020]*[=+\-@]/.test(text)
    ? `'${text}`
    : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function phpCsvValue(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

export async function exportOrderSalesReportCsvAction(payload: unknown) {
  const { supabase } = await requirePermission(PERMISSIONS.ordersRead, '/admin/reports');
  const parsed = orderSalesReportFiltersSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Review the report dates and filters.' } as const;
  }
  const input = parsed.data;

  try {
    const { data, error } = await supabase.rpc('admin_order_sales_report_export', {
      p_start_at: manilaMidnight(input.startDate),
      p_end_at: manilaMidnight(addDays(input.endDate, 1)),
      p_branch_id: input.branchId,
      p_agent_id: input.agentId,
      p_search: input.search || null,
    });
    if (error) {
      console.error('Could not export the order sales report.', error);
      return { success: false, error: 'The sales report could not be exported.' } as const;
    }

    const result = orderSalesReportExportSchema.safeParse(data);
    if (!result.success) {
      console.error('Order sales report export did not match the expected contract.', result.error);
      return { success: false, error: 'The sales report returned invalid export data.' } as const;
    }

    const dateFormatter = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'short',
      timeStyle: 'medium',
    });
    const rows = [
      ['Sale / order date and time (Asia/Manila)', 'Receipt / invoice', 'Customer', 'Branch', 'Sales agent', 'Model / serial details', 'Checkout method', 'Provider', 'Total PHP', 'Amount paid PHP', 'Balance due PHP', 'Status'],
      ...result.data.rows.map((row) => [
        dateFormatter.format(new Date(row.completed_at ?? row.created_at)),
        row.invoice_no || row.order_number,
        row.customer_name,
        row.branch_name,
        row.sales_agent_name,
        row.items,
        row.payment_method,
        row.payment_provider ?? '',
        phpCsvValue(row.total_minor),
        phpCsvValue(row.amount_paid_minor),
        phpCsvValue(row.balance_due_minor),
        row.status,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    return {
      success: true,
      data: {
        csv: `\uFEFF${csv}`,
        fileName: `sales-report-${input.startDate}-${input.endDate}.csv`,
        total: result.data.total,
        exported: result.data.rows.length,
        truncated: result.data.truncated,
      },
    } as const;
  } catch (error) {
    console.error('Could not export the order sales report.', error);
    return { success: false, error: 'The sales report could not be exported.' } as const;
  }
}
