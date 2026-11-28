import { Suspense } from 'react';
import { StorefrontHomePage } from '@/components/shop/StorefrontHomePage';
import { StorefrontPermissionNotice } from '@/components/shop/StorefrontPermissionNotice';

export const metadata = { title: 'Home' };
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}><StorefrontPermissionNotice /></Suspense>
      <StorefrontHomePage />
    </>
  );
}
