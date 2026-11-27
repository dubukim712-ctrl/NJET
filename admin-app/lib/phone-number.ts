import { philippineMobileSchema } from './validations/philippine-mobile.ts';

export function sanitizePhilippineMobileInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function formatSavedPhilippineMobileNumber(value: string | null | undefined): string {
  const stored = value ?? '';
  const local = /^\+639\d{9}$/.test(stored) ? '0' + stored.slice(3) : stored;
  return philippineMobileSchema.safeParse(local).success ? local : '';
}

// Profile storage and the SMS gateway use E.164. Call with a validated local number.
export function toPhilippineMobileE164(localNumber: string): string {
  return '+63' + localNumber.slice(1);
}
