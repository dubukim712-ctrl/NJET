import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Sign Up',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return (
    <AuthPageLayout>
      <RegisterForm />
    </AuthPageLayout>
  );
}