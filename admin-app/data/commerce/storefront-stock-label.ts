export function getStorefrontStockLabel(
  availability: { available: boolean; stock: number | null } | null | undefined,
  signedIn: boolean,
): string {
  if (!availability?.available) return 'Out of stock';
  if (signedIn && availability.stock !== null) return `${availability.stock} in stock`;
  return 'Available';
}
