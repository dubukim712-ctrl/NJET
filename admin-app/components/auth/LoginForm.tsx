"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/data/actions/auth";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthOptions } from "@/components/auth/AuthOptions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const safeRedirect =
    requestedRedirect &&
    requestedRedirect.startsWith("/") &&
    !requestedRedirect.startsWith("//") &&
    !requestedRedirect.startsWith("/\\")
      ? requestedRedirect
      : null;
  const queryError = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    if (safeRedirect) formData.set("redirectTo", safeRedirect);

    const result = await loginAction(formData);

    if (result.success) {
      toast.success("Welcome back!");
      window.location.assign(result.data.redirectTo);
    } else {
      setServerError(result.error);
      toast.error(result.error);
    }
  };

  const queryErrorMessages: Record<string, string> = {
    auth_callback_failed: "We couldn't complete sign in. Please try again.",
    recovery_link_expired: "That reset link has expired. Request a new one.",
  };
  const initialError = queryError
    ? (queryErrorMessages[queryError] ?? "Sign in failed. Please try again.")
    : null;
  const errorMessage = serverError ?? initialError;

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and password to access your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leadingIcon={<Mail className="h-4 w-4" />}
          trailingIcon={
            errors.email ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : undefined
          }
          error={errors.email?.message}
          disabled={isSubmitting}
          {...register("email")}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            show={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            disabled={isSubmitting}
            {...register("password")}
          />
        </div>

        {errorMessage && (
          <div
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <AuthOptions disabled={isSubmitting} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <a
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </a>
      </p>
    </div>
  );
}
