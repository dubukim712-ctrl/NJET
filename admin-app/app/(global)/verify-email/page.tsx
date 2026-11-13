import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { EmailVerificationForm } from '@/components/auth/EmailVerificationForm';

export const metadata = {
  title: 'Verify your email',
  description: 'Verify your email address to finish creating your account.',
};

export default function VerifyEmailPage() {
  return (
    <AuthPageLayout>
      <EmailVerificationForm />
    </AuthPageLayout>
  );
}
