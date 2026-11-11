import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  leadingIcon?: ReactNode;
  containerClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      id,
      label,
      helperText,
      error,
      leadingIcon,
      containerClassName = "",
      className = "",
      required,
      children,
      "aria-describedby": ariaDescribedBy,
      ...selectProps
    },
    ref,
  ) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helperId = helperText ? `${selectId}-help` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy =
      [ariaDescribedBy, helperId, errorId].filter(Boolean).join(" ") ||
      undefined;

    return (
      <div className={`min-w-0 space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            className="block break-words text-sm font-medium leading-5 text-foreground"
            htmlFor={selectId}
          >
            {label}
            {required && (
              <span aria-hidden="true" className="ml-1 text-destructive">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative min-w-0">
          <select
            {...selectProps}
            aria-describedby={describedBy}
            aria-invalid={error ? true : selectProps["aria-invalid"]}
            className={`block min-h-11 w-full min-w-0 appearance-none rounded-md border bg-card py-2 pr-10 text-base leading-5 text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:text-sm ${
              leadingIcon ? "pl-10" : "pl-3"
            } ${
              error
                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
                : "border-border"
            } ${className}`}
            id={selectId}
            ref={ref}
            required={required}
          >
            {children}
          </select>
          {leadingIcon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground"
            >
              {leadingIcon}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
        </div>
        {helperText && (
          <p
            className="break-words text-xs leading-5 tracking-wide text-muted-foreground"
            id={helperId}
          >
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
      </div>
    );
  },
);

Select.displayName = "Select";
