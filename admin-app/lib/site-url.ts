function parseOrigin(value: string | undefined): URL | null {
  if (!value || !/^https?:\/\/[^/?#\\]+\/?$/i.test(value)) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  const isProduction = process.env.NODE_ENV === 'production';
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
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
      hostname !== 'localhost' &&
      !hostname.endsWith('.localhost') &&
      !hostname.startsWith('127.') &&
      hostname !== '[::1]' &&
      hostname !== '0.0.0.0'
    ))
  ) {
    return url.origin;
  }

  if (isProduction) {
    throw new Error('Password recovery requires a valid production HTTPS origin in NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_VERCEL_URL.');
  }

  return 'http://localhost:3000';
}
