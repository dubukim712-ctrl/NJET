"use client";

import Image from "next/image";
import Link from "next/link";
import { useStorefrontBusinessInfoQuery } from "@/data/commerce/storefront-business-info-client";

export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  const { data: businessInfo } = useStorefrontBusinessInfoQuery();
  const businessName = businessInfo?.businessName || "";
  return (
    <div className="flex min-h-dvh flex-col bg-background p-4 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:p-0">
      <aside className="relative hidden min-h-dvh overflow-hidden lg:block">
        <Image
          src="/auth/ride-background.svg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 0vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10251f]/95 via-[#10251f]/55 to-[#10251f]/30" />
        <div className="relative z-10 flex min-h-dvh flex-col justify-between p-10 text-white xl:p-14">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em]">
            <h1 className="text-2xl font-bold">{businessName}</h1>
          </Link>
          <div className="max-w-xl pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c489]">
              Your next ride starts here
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight xl:text-6xl">
              Make every journey your own.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/85">
              Find e-bikes, parts, and everyday essentials for the road ahead.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center lg:min-h-dvh lg:flex-none lg:justify-center lg:p-12">
        <div className="my-auto w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8 lg:my-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {children}
        </div>
      </main>
    </div>
  );
}
