import { StorefrontShell } from '@/components/layout/StorefrontShell';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontShell user={null}>{children}</StorefrontShell>;
}
