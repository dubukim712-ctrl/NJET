import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasPermission, PERMISSIONS, surfaceHome } from "@/lib/permissions";

const PROTECTED_PATHS = [
  "/dashboard",
  "/admin",
  "/settings",
  "/profile",
  "/checkout",
];
const AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];
const ADMIN_PATHS = ["/admin"];
const STOREFRONT_PATHS = ["/dashboard", "/checkout"];

type SurfaceProfile = {
  scope: "staff" | "customer";
  is_full_access: boolean;
  permissions: string[];
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { url, key };
}

function redirectWithCookies(url: URL, source: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

function matches(pathname: string, paths: string[]) {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function insufficientRedirect(
  pathname: string,
  profile: SurfaceProfile | null,
  request: NextRequest,
  source: NextResponse,
) {
  if (!profile) {
    return redirectWithCookies(new URL("/no-access", request.url), source);
  }

  const isAdminPage = matches(pathname, ADMIN_PATHS);

  if (isAdminPage && hasPermission(profile, PERMISSIONS.storefrontAccess)) {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set("error", "insufficient_permissions");
    return redirectWithCookies(url, source);
  }

  if (!isAdminPage && hasPermission(profile, PERMISSIONS.adminAccess)) {
    const url = new URL("/admin", request.url);
    url.searchParams.set("error", "insufficient_permissions");
    return redirectWithCookies(url, source);
  }

  return redirectWithCookies(new URL("/no-access", request.url), source);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: never trust getSession() in server code.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = matches(pathname, PROTECTED_PATHS);
  const isAuthPage = matches(pathname, AUTH_PATHS);
  const isStorefrontPage = matches(pathname, STOREFRONT_PATHS);

  if (isProtected && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return redirectWithCookies(url, supabaseResponse);
  }

  if (!user || (!isStorefrontPage && !isAuthPage)) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("scope, is_full_access, permissions")
    .eq("id", user.id)
    .single<SurfaceProfile>();

  if (isAuthPage) {
    return redirectWithCookies(
      new URL(surfaceHome(profile), request.url),
      supabaseResponse,
    );
  }

  if (
    isStorefrontPage &&
    !hasPermission(profile, PERMISSIONS.storefrontAccess)
  ) {
    return insufficientRedirect(pathname, profile, request, supabaseResponse);
  }

  return supabaseResponse;
}
