"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SmartLinkProps = LinkProps & Omit<ComponentPropsWithRef<"a">, keyof LinkProps | "children"> & {
  children: ReactNode;
  className?: string;
};

const routePath = (path: string) => path.replace(/\/+$/, "") || "/";

function internalDestination(anchor: HTMLAnchorElement) {
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  const destination = new URL(anchor.href);
  return /^https?:$/.test(destination.protocol) && destination.origin === window.location.origin
    ? destination
    : null;
}

export function SmartLink({
  className, children, onClick, onMouseEnter, onTouchStart, onFocus, prefetch: prefetchMode, ...props
}: SmartLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  function prefetch(anchor: HTMLAnchorElement) {
    if (prefetchMode === false) return;
    const destination = internalDestination(anchor);
    if (!destination || (
      routePath(destination.pathname) === routePath(pathname) &&
      destination.search === window.location.search
    )) return;
    router.prefetch(destination.pathname + destination.search);
  }

  return (
    <Link
      {...props}
      prefetch={prefetchMode}
      className={cn(
        "transition-all duration-150 active:scale-[0.98] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (!event.defaultPrevented) prefetch(event.currentTarget);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        if (!event.defaultPrevented) prefetch(event.currentTarget);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented && event.currentTarget.matches(":focus-visible")) prefetch(event.currentTarget);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const destination = internalDestination(event.currentTarget);
        if (!destination) return;
        const current = window.location;
        const alreadyHere = routePath(destination.pathname) === routePath(current.pathname) &&
          destination.search === current.search && !destination.hash && !current.hash;
        if (alreadyHere || event.defaultPrevented) {
          event.preventDefault();
          // The global loader listens for clicks at the document level.
          event.stopPropagation();
        }
      }}
    >
      {children}
    </Link>
  );
}
