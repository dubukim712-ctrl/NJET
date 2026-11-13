import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { createClient } from "@/data/supabase/server";
import type { UserProfile } from "@/types/database";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "NJET | Noel & Jane E-bike Trading",
    template: "%s | Noel & Jane E-bike Trading",
  },
  description: "Explore e-bikes, spare parts, and accessories from NJET.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: UserProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data ?? null;
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans antialiased">
        <AuthProvider key={profile?.id ?? "anonymous"} initialUser={profile}>
          <CartProvider>
            <QueryProvider>{children}</QueryProvider>
          </CartProvider>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
