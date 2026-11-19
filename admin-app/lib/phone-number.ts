export function normalizePhilippineMobileNumber(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, '');
  if (/^09[0-9]{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^9[0-9]{9}$/.test(digits)) return `+63${digits}`;
  if (/^639[0-9]{9}$/.test(digits)) return `+${digits}`;
  return null;
}
