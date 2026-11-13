'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { SIGNUP_OTP_LENGTH } from '@/lib/validations/auth';

export function OtpCodeInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const enterDigits = (index: number, digits: string) => {
    const next = [...value];
    const accepted = digits
      .replace(/\D/g, '')
      .slice(0, SIGNUP_OTP_LENGTH - index);
    accepted.split('').forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    onChange(next);

    if (accepted) {
      inputs.current[
        Math.min(index + accepted.length, SIGNUP_OTP_LENGTH - 1)
      ]?.focus();
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < SIGNUP_OTP_LENGTH - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    } else if (
      event.key === 'Backspace' &&
      !value[index] &&
      index > 0
    ) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    event: ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;

    event.preventDefault();
    enterDigits(index, digits);
  };

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">
        {SIGNUP_OTP_LENGTH}-digit verification code
      </legend>
      <div className="grid grid-cols-8 gap-1 sm:gap-2">
        {Array.from({ length: SIGNUP_OTP_LENGTH }, (_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            aria-label={`Digit ${index + 1} of ${SIGNUP_OTP_LENGTH}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'verification-code-error' : undefined}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            inputMode="numeric"
            pattern="[0-9]*"
            type="text"
            maxLength={index === 0 ? SIGNUP_OTP_LENGTH : 1}
            value={value[index] ?? ''}
            onChange={(event) => {
              if (!event.currentTarget.value) {
                const next = [...value];
                next[index] = '';
                onChange(next);
                return;
              }
              enterDigits(index, event.currentTarget.value);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={(event) => handlePaste(event, index)}
            className="h-12 min-w-0 rounded-md border border-border bg-card text-center text-lg font-semibold text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        ))}
      </div>
      {error && (
        <p id="verification-code-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
