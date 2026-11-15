'use client';

import { useState } from 'react';
import { ChevronDown, Download, Printer, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import type { OrderSalesDatePreset } from '@/lib/reports/order-sales-dates';
import type { OrderSalesReportOptions } from '@/lib/validations/order-sales-report';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

const PRESETS: { id: OrderSalesDatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'year_to_date', label: 'Year to date' },
];

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dateRange = startDate === endDate
    ? DATE_FORMATTER.format(new Date(`${startDate}T00:00:00Z`))
    : `${DATE_FORMATTER.format(new Date(`${startDate}T00:00:00Z`))} – ${DATE_FORMATTER.format(new Date(`${endDate}T00:00:00Z`))}`;

  return (
    <div className="sticky top-16 z-30 max-h-[calc(100dvh-5rem)] space-y-3 overflow-y-auto print:hidden">
      <div className="rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Sales report</h2>
            <p className="truncate text-xs text-muted-foreground">{dateRange}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={filtersOpen}
              aria-controls="sales-report-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="mr-1.5 size-4" aria-hidden="true" />
              Filters
              <ChevronDown
                className={`ml-1 size-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Export CSV"
              title="Export CSV"
              onClick={onExport}
              loading={exporting}
            >
              <Download className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Print or save as PDF"
              title="Print / PDF"
              onClick={onPrint}
            >
              <Printer className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      {filtersOpen && (
        <section id="sales-report-filters" className="space-y-3 rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:p-4">
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
            <DatePicker
              label="Start date"
              name="reportStartDate"
              value={startDate}
              max={endDate}
              onChange={onStartDate}
            />
            <DatePicker
              label="End date"
              name="reportEndDate"
              value={endDate}
              min={startDate}
              onChange={onEndDate}
            />
            <Select
              label="Compare with"
              value={compareMode}
              onValueChange={(value) => onCompareMode(value as 'previous_period' | 'last_year')}
            >
              <option value="previous_period">Previous period</option>
              <option value="last_year">Same period last year</option>
            </Select>
            <Select
              label="Branch"
              value={branchId ?? ''}
              disabled={!options}
              onValueChange={(value) => onBranch(value || null)}
            >
              <option value="">All accessible branches</option>
              {options?.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </Select>
            <Select
              label="Sales agent"
              value={agentId ?? ''}
              disabled={!options}
              onValueChange={(value) => onAgent(value || null)}
            >
              <option value="">All agents</option>
              {options?.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Dates use Asia/Manila time.</p>
        </section>
      )}
    </div>
  );
}
