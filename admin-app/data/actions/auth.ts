"use server";

import { authenticatorVerificationPath, getPasswordResetStatus } from '@/data/auth/mfa';
import { isVerificationRateLimited } from '@/data/auth/verification-email';
import { revalidatePath } from "next/cache";
import { createClient } from "@/data/supabase/server";
import { queueWelcomeEmail } from "@/data/email/welcome-email";
import { getSiteUrl } from "@/lib/site-url";
import { surfaceHome } from "@/lib/permissions";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      verificationRequired?: boolean;
      rateLimited?: boolean;
    };

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string; requiresVerification?: boolean }>> {
  const supabase = await createClient();

  const validation = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      if (error.code === "email_not_confirmed") {
        return {
          success: false,
          error: "Verify your email before signing in.",
          verificationRequired: true,
        };
      }
      return { success: false, error: "Invalid email or password." };
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("scope, is_full_access, permissions")
      .eq("id", data.user.id)
      .single();

    const home = surfaceHome(profile);
    const requested = formData.get("redirectTo");
    const safeRequested =
      typeof requested === "string" &&
      requested.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.startsWith("/\\")
        ? requested
        : null;

    let redirectTo = home;

    if (safeRequested) {
      if (
        home === "/admin" &&
        (safeRequested.startsWith("/admin") ||
          safeRequested.startsWith("/dashboard"))
      ) {
        redirectTo = safeRequested;
      } else if (
        (home === "/" || home === "/dashboard") &&
        (safeRequested.startsWith("/dashboard") ||
          safeRequested.startsWith("/checkout"))
      ) {
        redirectTo = safeRequested;
      }
    }

    if (home === "/no-access") {
      redirectTo = "/no-access";
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(data.session.access_token);
    if (assurance.error) {
      return { success: false, error: "Could not check your sign-in security. Please try again." };
    }
    if (assurance.data.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2') {
      return { success: true, data: {
        redirectTo: authenticatorVerificationPath(redirectTo),
        requiresVerification: true,
      } };
    }

    revalidatePath("/", "layout");
    return { success: true, data: { redirectTo } };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function registerAction(
  formData: FormData,
): Promise<ActionResult<{ otpSent: boolean }>> {
  const supabase = await createClient();

  const validation = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    fullName: formData.get("fullName") || undefined,
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { email, password, fullName } = validation.data;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
        data: { full_name: fullName ?? null },
      },
    });

    if (
      error?.code === "email_exists" ||
      error?.code === "user_already_exists" ||
      data.user?.identities?.length === 0
    ) {
      return {
        success: false,
        error: "An account with this email already exists. Sign in or reset your password.",
      };
    }

    if (error) {
      return {
        success: false,
        error: isVerificationRateLimited(error)
          ? "Too many verification requests. Please wait before trying again."
          : "Unable to create your account. Please try again.",
        rateLimited: isVerificationRateLimited(error),
      };
    }

    if (data.session && data.user) queueWelcomeEmail(data.user);
    return { success: true, data: { otpSent: !data.session } };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const validation = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Please enter a valid email address.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      validation.data.email,
      {
        redirectTo: `${getSiteUrl()}/auth/confirm`,
      },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const validation = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const status = await getPasswordResetStatus(supabase.auth);
    if (status === 'challenge') {
      return { success: false, error: 'Verify your authenticator code before changing your password. Refresh this page to continue.' };
    }
    if (status !== 'ready') {
      return { success: false, error: 'Could not verify your recovery session. Open your password reset link and try again.' };
    }

    const { error } = await supabase.auth.updateUser({
      password: validation.data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
