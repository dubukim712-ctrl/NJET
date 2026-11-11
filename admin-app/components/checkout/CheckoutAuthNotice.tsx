import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CheckoutAuthNotice({
  needsSignIn,
}: {
  needsSignIn: boolean;
}) {
  return (
    <section
      className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-5"
      role="status"
    >
      <h2 className="font-semibold">
        {needsSignIn ? 'Sign in to continue checkout' : 'Customer access required'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {needsSignIn
          ? 'You must be signed in to place your order. Your cart will be here when you return.'
          : 'This account does not have permission to place customer orders.'}
      </p>
      {needsSignIn && (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login?redirect=%2Fcheckout">Sign in</Link>
          </Button>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            Create an account
          </Link>
        </div>
      )}
    </section>
  );
}
