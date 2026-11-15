import { StorefrontShell } from '@/components/layout/StorefrontShell';
import { SupportChatLauncher } from '@/components/support-chat/SupportChatLauncher';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StorefrontShell user={null}>{children}</StorefrontShell>
      <SupportChatLauncher />
    </>
  );
}
