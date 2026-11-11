import { Suspense } from "react";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your account",
};

function LoginFormFallback() {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <div className="mx-auto h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="mx-auto h-4 w-64 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthPageLayout>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthPageLayout>
  );
}
