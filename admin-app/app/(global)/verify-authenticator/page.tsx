import { redirect } from 'next/navigation';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthenticatorSignIn } from '@/components/auth/AuthenticatorSignIn';
import { authenticatorDestination, needsAuthenticatorVerification } from '@/data/auth/mfa';
import { createClient } from '@/data/supabase/server';

export const metadata = { title: 'Verify authenticator' };

export default async function VerifyAuthenticatorPage({
  searchParams,
}: { searchParams: Promise<{ redirect?: string }> }) {
  const destination = authenticatorDestination((await searchParams).redirect);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login?' + new URLSearchParams({ redirect: destination }));
  if (!await needsAuthenticatorVerification(supabase.auth, user)) redirect(destination);

  return (
    <AuthPageLayout>
      <AuthenticatorSignIn destination={destination} />
    </AuthPageLayout>
  );
}
