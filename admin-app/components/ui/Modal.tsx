"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from '@/components/ui/Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  size?: "default" | "wide";
  placement?: "center" | "bottom";
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  bodyClassName,
  size = "default",
  placement = "center",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bottomSheet = placement === "bottom";
  const width = size === "wide" ? "max-w-3xl" : "max-w-xl";
  const hasFooter = footer != null;
  const viewportHeight = hasFooter
    ? "max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh]"
    : "max-h-[90dvh]";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`fixed z-50 ${viewportHeight} overflow-visible border-0 bg-transparent p-0 text-card-foreground shadow-none backdrop:bg-black/50 ${bottomSheet ? "inset-x-0 bottom-0 top-auto m-0 w-full max-w-none rounded-t-2xl" : `inset-0 m-auto w-[calc(100%-2rem)] rounded-xl ${width}`}`}
    >
      <div className={`${viewportHeight} ${hasFooter ? "flex flex-col overflow-hidden" : "overflow-y-auto"} border bg-card text-card-foreground shadow-xl ${bottomSheet ? "rounded-t-2xl" : "rounded-xl"}`}>
        <header className={`${hasFooter ? "shrink-0" : "sticky top-0 z-10"} flex items-center justify-between gap-4 border-b bg-card px-4 py-3 sm:px-5 sm:py-4`}>
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button variant="ghost" size={null}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </header>
        {hasFooter ? (
          <>
            <div
              role="region"
              aria-label={title + " content"}
              tabIndex={0}
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 ${bodyClassName ?? ""}`}
            >
              {children}
            </div>
            <footer className="shrink-0 border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6">
              {footer}
            </footer>
          </>
        ) : (
          <div className={bottomSheet ? "px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]" : "p-4 sm:p-6"}>{children}</div>
        )}
      </div>
    </dialog>
  );
}
