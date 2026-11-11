import {
  forwardRef,
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id,
      label,
      helperText,
      error,
      containerClassName = '',
      className = '',
      required,
      'aria-describedby': ariaDescribedBy,
      ...textareaProps
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helperId = helperText ? `${textareaId}-help` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy =
      [ariaDescribedBy, helperId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`min-w-0 space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            className="block break-words text-sm font-medium leading-5 text-foreground"
            htmlFor={textareaId}
          >
            {label}
            {required && (
              <span aria-hidden="true" className="ml-1 text-destructive">*</span>
            )}
          </label>
        )}
        <textarea
          {...textareaProps}
          aria-describedby={describedBy}
          aria-invalid={error ? true : textareaProps['aria-invalid']}
          className={`block min-h-24 w-full min-w-0 rounded-md border bg-card px-3 py-2 text-base leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:text-sm ${
            error
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25'
              : 'border-border'
          } ${className}`}
          id={textareaId}
          ref={ref}
          required={required}
        />
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

Textarea.displayName = 'Textarea';
