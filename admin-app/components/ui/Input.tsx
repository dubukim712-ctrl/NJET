import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  containerClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helperText,
    error,
    leadingIcon,
    trailingIcon,
    containerClassName = "",
    className = "",
    required,
    "aria-describedby": ariaDescribedBy,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`min-w-0 space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          className="block break-words text-sm font-medium leading-5 text-foreground"
          htmlFor={inputId}
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
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground"
          >
            {leadingIcon}
          </span>
        )}
        <input
          {...inputProps}
          aria-describedby={describedBy}
          aria-invalid={error ? true : inputProps["aria-invalid"]}
          className={`block min-h-11 w-full min-w-0 rounded-md border bg-card py-2 text-base leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:text-sm ${
            leadingIcon ? "pl-10 pr-3" : "px-3"
          } ${trailingIcon ? "pr-10" : ""} ${
            error
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
              : "border-border"
          } ${className}`}
          id={inputId}
          ref={ref}
          required={required}
        />
        {trailingIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
          >
            {trailingIcon}
          </span>
        )}
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
});

Input.displayName = "Input";
