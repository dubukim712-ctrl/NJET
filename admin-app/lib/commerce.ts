import type { ProductType } from '@/types/commerce-tables';

export const TERMS_VERSION = 'NJET-TERMS-DRAFT-1';
export const PRIVACY_VERSION = 'NJET-PRIVACY-DRAFT-1';

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  ebike: 'E-bike',
  part: 'Spare part',
  accessory: 'Accessory',
};

export function productTypeLabel(productType: ProductType) {
  return PRODUCT_TYPE_LABELS[productType];
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

export function formatPhp(amountMinor: number) {
  return pesoFormatter.format(amountMinor / 100);
}

export function parsePhpAmount(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount <= 2147483647 ? amount : null;
}

export function buildOrdersHref({
  search,
  status,
  branchId,
}: {
  search?: string;
  status?: string;
  branchId?: string;
}) {
  const params = new URLSearchParams();
  if (search?.trim()) params.set('q', search.trim());
  if (status) params.set('status', status);
  if (branchId) params.set('branch', branchId);

  const query = params.toString();
  return `/admin/orders${query ? `?${query}` : ''}`;
}

export function getProductImageUrl(path: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return path && baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/njet-product-images/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`
    : null;
}
