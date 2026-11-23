"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { RefObject } from "react";
import { monthDays, toDateValue } from "@/components/ui/date-picker-dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type DatePickerCalendarPosition = {
  top: number;
  left: number;
  width: number;
};

export function DatePickerCalendar({
  calendarId, calendarRef, label, position, visibleMonth, selectedValue, minValue, maxValue,
  changeMonth, chooseDay, onDismiss, onClose,
}: {
  calendarId: string;
  calendarRef: RefObject<HTMLElement | null>;
  label: string;
  position: DatePickerCalendarPosition | null;
  visibleMonth: Date;
  selectedValue: string;
  minValue?: string;
  maxValue?: string;
  changeMonth: (amount: number) => void;
  chooseDay: (day: number) => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const monthLabel = visibleMonth.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const days = monthDays(visibleMonth);

  return (
    <>
      <button
        aria-label="Close calendar"
        className="fixed inset-0 z-[60] bg-[#10231f]/45 md:hidden"
        onClick={onDismiss}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-2xl border border-[#c9c4b8] bg-[#fffefa] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_16px_40px_rgba(16,30,25,0.2)] md:inset-x-auto md:bottom-auto md:rounded-xl md:p-3"
        id={calendarId}
        ref={calendarRef}
        role="dialog"
        style={position ?? undefined}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <button
            aria-label="Previous month"
            className="grid size-11 shrink-0 place-items-center rounded-md text-[#26342f] hover:bg-[#efede5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315b50]"
            onClick={() => changeMonth(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <h2
            aria-live="polite"
            className="min-w-0 text-center text-sm font-semibold text-[#202a28]"
          >
            {monthLabel}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Next month"
              className="grid size-11 place-items-center rounded-md text-[#26342f] hover:bg-[#efede5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315b50]"
              onClick={() => changeMonth(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <button
              aria-label="Close calendar"
              className="grid size-11 place-items-center rounded-md text-[#26342f] hover:bg-[#efede5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315b50] md:hidden"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </header>
        <div
          aria-label={monthLabel}
          className="grid grid-cols-7 gap-1"
          role="grid"
        >
          {WEEKDAYS.map((weekday) => (
            <span
              aria-label={weekday}
              className="grid h-8 place-items-center text-[0.68rem] font-semibold text-[#4c5a56]"
              key={weekday}
              role="columnheader"
            >
              {weekday.slice(0, 1)}
            </span>
          ))}
          {days.map((day, index) => {
            if (day === null) {
              return (
                <span
                  aria-hidden="true"
                  className="h-10"
                  key={`blank-${index}`}
                />
              );
            }
            const date = new Date(
              Date.UTC(
                visibleMonth.getUTCFullYear(),
                visibleMonth.getUTCMonth(),
                day,
              ),
            );
            const dateValue = toDateValue(date);
            const selected = dateValue === selectedValue;
            const unavailable =
              (minValue !== undefined && dateValue < minValue) ||
              (maxValue !== undefined && dateValue > maxValue);
            return (
              <button
                aria-label={date.toLocaleDateString("en-PH", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
                aria-selected={selected}
                className={`grid size-10 place-items-center rounded-md text-sm tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#24583b] disabled:cursor-not-allowed disabled:text-[#68736e] ${
                  selected
                    ? "bg-[#24583b] font-semibold text-white"
                    : "text-[#202a28] hover:bg-[#efede5]"
                }`}
                disabled={unavailable}
                key={dateValue}
                onClick={() => chooseDay(day)}
                role="gridcell"
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
