'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  exportOrderSalesReportCsvAction,
} from '@/data/actions/order-sales-report';
import {
  OrderSalesReportQueryError,
  useOrderSalesReportOptionsQuery,
  useOrderSalesReportQuery,
} from '@/data/commerce/order-sales-report-client';
import { ReportCharts } from '@/components/admin/reports/ReportCharts';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { ReportLedger } from '@/components/admin/reports/ReportLedger';
import { ReportSummary } from '@/components/admin/reports/ReportSummary';
import {
  getOrderSalesPresetRange,
  type OrderSalesDatePreset,
} from '@/lib/reports/order-sales-dates';
import type { OrderSalesReportFilters } from '@/lib/validations/order-sales-report';

export function OrderSalesReport({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const [range, setRange] = useState(() => getOrderSalesPresetRange('today'));
  const [compareMode, setCompareMode] =
    useState<OrderSalesReportFilters['compareMode']>('previous_period');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<OrderSalesReportFilters>(() => ({
    ...range,
    compareMode,
    branchId,
    agentId,
    search,
    page,
    pageSize,
  }), [range, compareMode, branchId, agentId, search, page, pageSize]);

  const optionsQuery = useOrderSalesReportOptionsQuery(userId);
  const reportQuery = useOrderSalesReportQuery(userId, filters);

  const setPreset = (preset: OrderSalesDatePreset) => {
    setRange(getOrderSalesPresetRange(preset));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await exportOrderSalesReportCsvAction(filters);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const file = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (result.data.truncated) {
        toast.warning(`Exported ${result.data.exported.toLocaleString()} of ${result.data.total.toLocaleString()} orders. Narrow the date range for a complete export.`);
      } else {
        toast.success(`${result.data.exported.toLocaleString()} orders exported.`);
      }
    } catch (error) {
      console.error('Could not export the order sales report.', error);
      toast.error('The sales report could not be exported.');
    } finally {
      setExporting(false);
    }
  };

  if (!reportQuery.data && reportQuery.isPending) {
    return (
      <div className="space-y-5" aria-label="Loading sales report">
        <div className="h-52 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl border border-border bg-muted/40" />
          <div className="h-72 animate-pulse rounded-xl border border-border bg-muted/40" />
        </div>
      </div>
    );
  }

  if (!reportQuery.data) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive" role="alert">
          {reportQuery.error instanceof OrderSalesReportQueryError
            ? reportQuery.error.message
            : 'The sales report could not be loaded.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void reportQuery.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5" aria-busy={reportQuery.isFetching}>
      {reportQuery.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          The report could not be refreshed. Showing the last loaded data.
        </p>
      )}
      <ReportFilters
        {...range}
        compareMode={compareMode}
        branchId={branchId}
        agentId={agentId}
        options={optionsQuery.data}
        exporting={exporting}
        onPreset={setPreset}
        onStartDate={(startDate) => {
          setRange((current) => ({ ...current, startDate }));
          setPage(1);
        }}
        onEndDate={(endDate) => {
          setRange((current) => ({ ...current, endDate }));
          setPage(1);
        }}
        onCompareMode={(mode) => {
          setCompareMode(mode);
          setPage(1);
        }}
        onBranch={(id) => {
          setBranchId(id);
          setPage(1);
        }}
        onAgent={(id) => {
          setAgentId(id);
          setPage(1);
        }}
        onExport={() => { void exportCsv(); }}
        onPrint={() => window.print()}
      />
      {reportQuery.isFetching && (
        <p className="text-sm text-muted-foreground" role="status">Updating report…</p>
      )}
      {optionsQuery.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="text-destructive" role="alert">Branch and agent filters could not be loaded.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { void optionsQuery.refetch(); }}>Retry filters</Button>
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Sales use completion date; other orders use the date they were placed. Collections, down payments, and refunds use their transaction dates. Gross profit is shown only when every completed item has a recorded sale-time cost and there are no refunds. Financing remains receivable until settlement is recorded.
      </p>
      <ReportSummary summary={reportQuery.data.summary} />
      <ReportCharts summary={reportQuery.data.summary} />
      <ReportLedger
        ledger={reportQuery.data.ledger}
        page={page}
        pageSize={pageSize}
        search={searchInput}
        canManage={canManage}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={setSearchInput}
        onPaymentRecorded={async () => {
          await reportQuery.refetch();
        }}
      />
    </div>
  );
}
