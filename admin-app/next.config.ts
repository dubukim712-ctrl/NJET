import type { NextConfig } from 'next';

function storagePatterns(): NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return [];
  try {
    const url = new URL(configuredUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return [];
    return [{
      protocol: url.protocol === 'https:' ? 'https' : 'http',
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/$/, '')}/storage/v1/object/**`,
    }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',')
    .map((host) => host.trim())
    .filter((host) => /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/i.test(host)) ?? [],
  images: {
    remotePatterns: storagePatterns(),
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 75],
  },
};

export default nextConfig;
