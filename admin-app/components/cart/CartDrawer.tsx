'use client';

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
      <button
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
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        id="cart-drawer"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-none rounded-none border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40 sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">Your cart</h2>
              <p className="text-sm text-muted-foreground">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <CartContents compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </dialog>
    </>
  );
}
