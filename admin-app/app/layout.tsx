import NextTopLoader from "nextjs-toploader";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSignInNotice } from "@/components/auth/AuthSignInNotice";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  preload: false,
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  preload: false,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans antialiased">
        <NextTopLoader color="var(--primary)" showSpinner={false} height={3} showForHashAnchor={false} />
        <AuthProvider initialUser={null}>
          <AuthSignInNotice />
          <CartProvider>
            <QueryProvider>{children}</QueryProvider>
          </CartProvider>
        </AuthProvider>
        <ToastProvider position="top-right" visibleToasts={3}>
        </ToastProvider>
      </body>
    </html>
  );
}
