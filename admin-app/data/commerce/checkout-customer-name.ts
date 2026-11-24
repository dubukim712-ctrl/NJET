export function resolveCheckoutCustomerName(
  profileName: string | null | undefined,
  metadata?: { full_name?: unknown; name?: unknown } | null,
): string {
  for (const candidate of [profileName, metadata?.full_name, metadata?.name]) {
    const name = typeof candidate === 'string' ? candidate.trim() : '';
    if (name) return name;
  }
  return '';
}
