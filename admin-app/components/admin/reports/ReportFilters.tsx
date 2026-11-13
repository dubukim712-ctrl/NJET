'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { OrderSalesDatePreset } from '@/lib/reports/order-sales-dates';
import type { OrderSalesReportOptions } from '@/lib/validations/order-sales-report';

const PRESETS: { id: OrderSalesDatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'year_to_date', label: 'Year to date' },
];

const selectClass =
  'min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

export function ReportFilters({
  startDate,
  endDate,
  compareMode,
  branchId,
  agentId,
  options,
  exporting,
  onPreset,
  onStartDate,
  onEndDate,
  onCompareMode,
  onBranch,
  onAgent,
  onExport,
  onPrint,
}: {
  startDate: string;
  endDate: string;
  compareMode: 'previous_period' | 'last_year';
  branchId: string | null;
  agentId: string | null;
  options?: OrderSalesReportOptions;
  exporting: boolean;
  onPreset: (preset: OrderSalesDatePreset) => void;
  onStartDate: (date: string) => void;
  onEndDate: (date: string) => void;
  onCompareMode: (mode: 'previous_period' | 'last_year') => void;
  onBranch: (id: string | null) => void;
  onAgent: (id: string | null) => void;
  onExport: () => void;
  onPrint: () => void;
}) {
  return (
    <section className="sticky top-16 z-30 space-y-4 rounded-xl border border-border/80 bg-background/95 p-4 shadow-sm backdrop-blur print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Report controls</h2>
          <p className="text-xs text-muted-foreground">Dates use Asia/Manila time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onExport} loading={exporting}>
            <Download className="mr-2 size-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={onPrint}>
            <Printer className="mr-2 size-4" aria-hidden="true" />
            Print / PDF
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Quick date presets">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5 text-sm font-medium">
          <span>Start date</span>
          <input
            className={selectClass}
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => onStartDate(event.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>End date</span>
          <input
            className={selectClass}
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => onEndDate(event.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>Compare with</span>
          <select
            className={selectClass}
            value={compareMode}
            onChange={(event) => onCompareMode(event.target.value as 'previous_period' | 'last_year')}
          >
            <option value="previous_period">Previous period</option>
            <option value="last_year">Same period last year</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>Branch</span>
          <select
            className={selectClass}
            value={branchId ?? ''}
            disabled={!options}
            onChange={(event) => onBranch(event.target.value || null)}
          >
            <option value="">All accessible branches</option>
            {options?.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>Sales agent</span>
          <select
            className={selectClass}
            value={agentId ?? ''}
            disabled={!options}
            onChange={(event) => onAgent(event.target.value || null)}
          >
            <option value="">All agents</option>
            {options?.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
