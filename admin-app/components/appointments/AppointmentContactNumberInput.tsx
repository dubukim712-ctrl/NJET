'use client';

import { Input, type InputProps } from '@/components/ui/Input';

export function AppointmentContactNumberInput(
  props: Omit<InputProps, 'type' | 'inputMode' | 'pattern' | 'minLength' | 'maxLength'>
) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      pattern="[0-9]{7,11}"
      minLength={7}
      maxLength={11}
      autoComplete="tel"
      onInput={(event) => {
        event.currentTarget.value = event.currentTarget.value
          .replace(/[^0-9]/g, '')
          .slice(0, 11);
      }}
    />
  );
}
