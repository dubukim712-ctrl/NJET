'use client';

import { Button } from '@/components/ui/Button';
import { useEffect, useId, useRef, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { CartContents } from '@/components/cart/CartContents';
import { useCart } from '@/components/cart/CartProvider';

export function CartDrawer() {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button variant={null} size={null}
        type="button"
        aria-controls="cart-drawer"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Shopping cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
        onClick={() => setOpen(true)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {itemCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-[#14242b]">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </Button>

      <dialog
        ref={dialogRef}
        id="cart-drawer"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="fixed bottom-0 inset-x-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-2xl border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 motion-safe:animate-[cart-sheet-in_180ms_ease-out] md:inset-y-0 md:left-auto md:h-dvh md:max-h-none md:max-w-md md:rounded-none md:animate-none"
      >
        <div className="flex h-[85dvh] flex-col md:h-full">
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/40 md:hidden" aria-hidden="true" />
          <header className="flex shrink-0 items-center justify-between border-b px-5 py-3 md:py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">Your cart</h2>
              <p className="text-sm text-muted-foreground">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </p>
            </div>
            <Button variant={null} size={null}
              type="button"
              onClick={() => setOpen(false)}
              className="size-11 rounded-full text-muted-foreground hover:bg-accent"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-5">
            <CartContents compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </dialog>
    </>
  );
}
