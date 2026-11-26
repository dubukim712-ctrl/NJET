import { useSyncExternalStore } from 'react';

const sections = ['installments', 'service-center', 'branches'] as const;

function subscribe(onChange: () => void) {
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(onChange);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('hashchange', schedule);
    window.removeEventListener('popstate', schedule);
  };
}

function visibleHomeLink() {
  const headerBottom = document.getElementById('storefront-header')?.getBoundingClientRect().bottom ?? 0;
  const readingLine = Math.max(headerBottom + 32, window.innerHeight * 0.25);
  for (const id of [...sections].reverse()) {
    const section = document.getElementById(id);
    if (section && section.getBoundingClientRect().top <= readingLine) return `/#${id}`;
  }
  return '/';
}

export function useStorefrontActiveLink(pathname: string) {
  const routeLink = pathname === '/' ? '/' : pathname === '/shop' || pathname.startsWith('/shop/') ? '/shop' : null;
  return useSyncExternalStore(
    subscribe,
    () => pathname === '/' ? visibleHomeLink() : routeLink,
    () => routeLink,
  );
}