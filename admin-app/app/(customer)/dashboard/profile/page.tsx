import { CustomerProfileQuery } from '@/components/auth/CustomerProfileQuery';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal information and saved contact details.
        </p>
      </div>

      <CustomerProfileQuery />
    </div>
  );
}