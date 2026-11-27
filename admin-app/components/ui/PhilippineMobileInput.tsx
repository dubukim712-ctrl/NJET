'use client';

import type { ClipboardEvent } from 'react';
import { Input, type InputProps } from '@/components/ui/Input';
import { sanitizePhilippineMobileInput } from '@/lib/phone-number';
import { PHILIPPINE_MOBILE_ERROR, PHILIPPINE_MOBILE_PATTERN } from '@/lib/validations/philippine-mobile';

type PhilippineMobileInputProps = Omit<InputProps,
  'type' | 'inputMode' | 'maxLength' | 'pattern' | 'placeholder' | 'onChange' | 'onPaste' | 'onInvalid'
> & {
  onValueChange?: (value: string) => void;
};

export function PhilippineMobileInput({ onValueChange, ...props }: PhilippineMobileInputProps) {
  function updateNumber(input: HTMLInputElement, value: string) {
    input.value = sanitizePhilippineMobileInput(value);
    input.setCustomValidity('');
    onValueChange?.(input.value);
  }

  function pasteNumber(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const paste = event.clipboardData.getData('text');
    updateNumber(input, input.value.slice(0, start) + paste + input.value.slice(end));
    const cursor = start + paste.replace(/\D/g, '').length;
    input.setSelectionRange(cursor, cursor);
  }

  return (
    <Input
      autoComplete="tel-national"
      {...props}
      type="tel"
      inputMode="numeric"
      maxLength={11}
      pattern={PHILIPPINE_MOBILE_PATTERN.source}
      placeholder="09171234567"
      onChange={(event) => updateNumber(event.currentTarget, event.currentTarget.value)}
      onPaste={pasteNumber}
      onInvalid={(event) => event.currentTarget.setCustomValidity(PHILIPPINE_MOBILE_ERROR)}
    />
  );
}
