"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/data/supabase/server";
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
    };

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
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

    revalidatePath("/", "layout");
    return { success: true, data: { redirectTo } };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function registerAction(
  formData: FormData,
): Promise<ActionResult> {
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
        error: "Unable to create your account. Please try again.",
      };
    }

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
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
        redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
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
