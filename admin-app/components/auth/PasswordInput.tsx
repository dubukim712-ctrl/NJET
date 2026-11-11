'use client';

import * as React from 'react';
import { AlertCircle, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: React.ReactNode;
  show?: boolean;
  onToggle?: () => void;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      error,
      id,
      show = false,
      onToggle,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy =
      [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div>
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            id={inputId}
            type={show ? 'text' : 'password'}
            leadingIcon={<LockKeyhole className="h-4 w-4" />}
            aria-invalid={error ? true : ariaInvalid}
            aria-describedby={describedBy}
            className={cn(
              'pr-10',
              error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25 pr-16',
              className
            )}
          />
          {error && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';