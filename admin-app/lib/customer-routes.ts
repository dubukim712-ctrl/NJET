export const PROTECTED_CUSTOMER_ROUTES = [
  '/appointments',
  '/cart',
  '/notifications',
  '/orders',
  '/profile',
  '/settings',
  '/checkout',
];

export function isWithinRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + '/');
}

export function normalizeAuthDestination(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return null;

  const base = 'https://local.invalid';
  const url = new URL(value, base);
  if (url.origin !== base || url.pathname.startsWith('//')) return null;

  const pathname = isWithinRoute(url.pathname, '/dashboard')
    ? url.pathname.slice('/dashboard'.length) || '/'
    : url.pathname;

  if (pathname.startsWith('//')) return null;
  return pathname + url.search + url.hash;
}
