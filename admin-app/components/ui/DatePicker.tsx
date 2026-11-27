"use client";

import { CalendarDays } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  DatePickerCalendar,
  type DatePickerCalendarPosition,
} from "@/components/ui/DatePickerCalendar";
import {
  displayDate, monthStart, parseDateValue, shiftMonth, toDateValue,
} from "@/components/ui/date-picker-dates";

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
  const [popupPosition, setPopupPosition] = useState<DatePickerCalendarPosition | null>(null);
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
        className="block break-words text-sm font-medium leading-5 text-foreground"
        htmlFor={buttonId}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-destructive">
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
        className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left text-base leading-5 text-foreground transition hover:border-foreground/60 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:pointer-fine:text-sm ${
          error
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive"
            : "border-input focus-visible:border-ring focus-visible:ring-ring"
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
          className="size-4 shrink-0 text-muted-foreground"
        />
      </button>
      {helperText && (
        <p className="break-words text-xs leading-5 text-muted-foreground" id={helperId}>
          {helperText}
        </p>
      )}
      {error && (
        <p
          className="break-words text-sm font-medium leading-5 text-destructive"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      )}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <DatePickerCalendar
            calendarId={calendarId}
            calendarRef={calendarRef}
            label={`${typeof label === "string" ? label : "Date"} calendar`}
            position={popupPosition}
            visibleMonth={visibleMonth}
            selectedValue={selectedValue}
            minValue={minValue}
            maxValue={maxValue}
            changeMonth={changeMonth}
            chooseDay={chooseDay}
            onDismiss={() => setOpen(false)}
            onClose={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />,
          document.body,
        )}
    </div>
  );
}
