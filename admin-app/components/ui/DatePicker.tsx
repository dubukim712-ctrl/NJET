"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateValue(value: string) {
  const match = DATE_VALUE_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateValue(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function shiftMonth(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function monthDays(date: Date) {
  const firstDay = monthStart(date);
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const numberOfDays = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: numberOfDays }, (_, index) => index + 1),
  ];
}

function displayDate(value: string) {
  const date = parseDateValue(value);
  return date
    ? date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Select a date";
}

export type DatePickerProps = {
  id?: string;
  label: ReactNode;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  helperText?: ReactNode;
  error?: ReactNode;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  buttonRef?: (node: HTMLButtonElement | null) => void;
};

export function DatePicker({
  id,
  label,
  name,
  value,
  defaultValue = "",
  onChange,
  helperText,
  error,
  min,
  max,
  required,
  disabled,
  buttonRef,
}: DatePickerProps) {
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const calendarId = `${buttonId}-calendar`;
  const helperId = helperText ? `${buttonId}-help` : undefined;
  const errorId = error ? `${buttonId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
  const selectedDate = parseDateValue(selectedValue);
  const [monthNavigation, setMonthNavigation] = useState(() => ({
    selectedValue,
    month: monthStart(selectedDate ?? new Date()),
  }));
  const visibleMonth =
    monthNavigation.selectedValue === selectedValue
      ? monthNavigation.month
      : monthStart(selectedDate ?? new Date());
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLElement>(null);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      buttonRef?.(node);
    },
    [buttonRef],
  );
  const safeMin = parseDateValue(min ?? "");
  const safeMax = parseDateValue(max ?? "");
  const minValue = safeMin ? toDateValue(safeMin) : undefined;
  const maxValue = safeMax ? toDateValue(safeMax) : undefined;
  const monthLabel = visibleMonth.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const days = monthDays(visibleMonth);

  const updatePopupPosition = useCallback(() => {
    if (window.innerWidth < 768 || !triggerRef.current) {
      setPopupPosition(null);
      return;
    }

    const trigger = triggerRef.current.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 32);
    const height = Math.min(
      calendarRef.current?.getBoundingClientRect().height ?? 400,
      window.innerHeight - 16,
    );
    const spaceBelow = window.innerHeight - trigger.bottom - 8;
    const spaceAbove = trigger.top - 8;
    const openAbove = spaceBelow < height && spaceAbove > spaceBelow;

    setPopupPosition({
      top: openAbove
        ? Math.max(8, trigger.top - height - 8)
        : Math.min(trigger.bottom + 8, window.innerHeight - height - 8),
      left: Math.max(
        16,
        Math.min(trigger.left, window.innerWidth - width - 16),
      ),
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !wrapperRef.current?.contains(event.target) &&
        !calendarRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    updatePopupPosition();
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open, updatePopupPosition]);

  function changeMonth(amount: number) {
    setMonthNavigation({
      selectedValue,
      month: shiftMonth(visibleMonth, amount),
    });
  }

  function chooseDay(day: number) {
    const date = new Date(
      Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), day),
    );
    const nextValue = toDateValue(date);

    if (
      (minValue && nextValue < minValue) ||
      (maxValue && nextValue > maxValue)
    ) {
      return;
    }

    if (value === undefined) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="relative min-w-0 space-y-1.5" ref={wrapperRef}>
      <label
        className="block break-words text-sm font-medium leading-5 text-[#26342f]"
        htmlFor={buttonId}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-[#8b3027]">
            *
          </span>
        )}
      </label>
      <input name={name} type="hidden" value={selectedValue} />
      <button
        aria-controls={calendarId}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border bg-[#fffefa] px-3 py-2 text-left text-base leading-5 text-[#202a28] transition hover:border-[#53635e] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-[#eceae2] disabled:text-[#4c5a56] md:text-sm ${
          error
            ? "border-[#9a372d] focus-visible:border-[#9a372d] focus-visible:ring-[#9a372d]/25"
            : "border-[#9ca69f] focus-visible:border-[#315b50] focus-visible:ring-[#315b50]/30"
        }`}
        disabled={disabled}
        id={buttonId}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            updatePopupPosition();
            setOpen(true);
          }
        }}
        ref={setTriggerRef}
        type="button"
      >
        <span className="min-w-0 truncate">{displayDate(selectedValue)}</span>
        <CalendarDays
          aria-hidden="true"
          className="size-4 shrink-0 text-[#3f4d47]"
        />
      </button>
      {helperText && (
        <p className="break-words text-xs leading-5 text-[#4c5a56]" id={helperId}>
          {helperText}
        </p>
      )}
      {error && (
        <p
          className="break-words text-sm font-medium leading-5 text-[#8b3027]"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      )}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              aria-label="Close calendar"
              className="fixed inset-0 z-[60] bg-[#10231f]/45 md:hidden"
              onClick={() => setOpen(false)}
              tabIndex={-1}
              type="button"
            />
            <section
              aria-label={`${typeof label === "string" ? label : "Date"} calendar`}
              className="fixed inset-x-0 bottom-0 z-[61] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-2xl border border-[#c9c4b8] bg-[#fffefa] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_16px_40px_rgba(16,30,25,0.2)] md:inset-x-auto md:bottom-auto md:rounded-xl md:p-3"
              id={calendarId}
              ref={calendarRef}
              role="dialog"
              style={{
                top: popupPosition?.top,
                left: popupPosition?.left,
                width: popupPosition?.width,
              }}
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
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
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
          </>,
          document.body,
        )}
    </div>
  );
}
