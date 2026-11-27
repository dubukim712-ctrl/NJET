function parseOrigin(value: string | undefined): URL | null {
  if (!value || !/^https?:\/\/[^/?#\\]+\/?$/i.test(value)) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isPublicHostname(hostname: string) {
  return hostname !== 'localhost' &&
    !hostname.endsWith('.localhost') &&
    !hostname.startsWith('127.') &&
    hostname !== '[::1]' &&
    hostname !== '0.0.0.0';
}

export function getCustomerEmailSiteUrl() {
  const override = process.env.CUSTOMER_EMAIL_SITE_URL?.trim();
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const candidates = override ? [override] : [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    vercel ? 'https://' + vercel : undefined,
  ];

  for (const candidate of candidates) {
    const url = parseOrigin(candidate);
    if (url?.protocol === 'https:' && !url.username && !url.password &&
        isPublicHostname(url.hostname.replace(/\.$/, ''))) {
      return url.origin;
    }
  }

  throw new Error('Customer emails require a public HTTPS origin in CUSTOMER_EMAIL_SITE_URL or NEXT_PUBLIC_SITE_URL.');
}

export function getSiteUrl() {
  const isProduction = process.env.NODE_ENV === 'production';
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  const configured = explicit || (vercel ? `https://${vercel}` : undefined);
  const url = parseOrigin(configured);
  const hostname = url?.hostname.replace(/\.$/, '');

  if (
    url &&
    (url.protocol === 'https:' || (!isProduction && url.protocol === 'http:')) &&
    !url.username &&
    !url.password &&
    (!isProduction || (
      hostname &&
      isPublicHostname(hostname)
    ))
  ) {
    return url.origin;
  }

  if (isProduction) {
    throw new Error('Auth email redirects require a valid HTTPS origin in NEXT_PUBLIC_SITE_URL or the Vercel deployment environment.');
  }

  return 'http://localhost:3000';
}
