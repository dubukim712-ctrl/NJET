"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast, type ToasterProps } from "sonner";

export type ToastProviderProps = ToasterProps;

function useToastHost() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  const attachHost = useCallback((anchor: HTMLSpanElement | null) => {
    if (!anchor) return;
    const viewport = document.createElement("div");
    viewport.className = "pointer-events-none fixed inset-0 z-[70] m-0 h-dvh w-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0";
    viewport.dataset.toastViewport = "";
    let dialogs = [...document.querySelectorAll<HTMLDialogElement>("dialog:modal")];

    function placeViewport() {
      dialogs = dialogs.filter((dialog) => dialog.isConnected && dialog.matches(":modal"));
      const dialog = dialogs.at(-1);
      const parent = dialog ?? document.body;
      if (viewport.parentElement === parent) return;

      // Native dialogs are in the top layer. Keep toasts inside the active
      // dialog for pointer and keyboard access, then lift them above its content.
      viewport.removeAttribute("popover");
      if (dialog && typeof viewport.showPopover === "function") viewport.setAttribute("popover", "manual");
      parent.append(viewport);
      if (viewport.hasAttribute("popover")) viewport.showPopover();
    }

    const observer = new MutationObserver((records) => {
      for (const { target } of records) {
        if (target instanceof HTMLDialogElement && target.matches(":modal")) {
          dialogs = [...dialogs.filter((dialog) => dialog !== target), target];
        }
      }
      placeViewport();
    });

    placeViewport();
    observer.observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ["open"], childList: true,
    });
    setHost(viewport);
    return () => {
      observer.disconnect();
      viewport.remove();
    };
  }, []);

  return { host, attachHost };
}

export function ToastProvider({
  position = "bottom-right",
  theme = "light",
  richColors = true,
  closeButton = true,
  visibleToasts = 4,
  mobileOffset = { bottom: 16, left: 16, right: 16 },
  toastOptions,
  ...props
}: ToastProviderProps) {
  const { host, attachHost } = useToastHost();
  const toaster = (
    <Toaster
      {...props}
      style={{ ...props.style, zIndex: 70, pointerEvents: "none" }}
      closeButton={closeButton}
      mobileOffset={mobileOffset}
      position={position}
      richColors={richColors}
      theme={theme}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: `pointer-events-auto font-sans ${toastOptions?.classNames?.toast ?? ""}`.trim(),
          title: `text-sm font-semibold ${toastOptions?.classNames?.title ?? ""}`.trim(),
          description: `text-sm leading-5 ${toastOptions?.classNames?.description ?? ""}`.trim(),
        },
      }}
      visibleToasts={visibleToasts}
    />
  );

  return (
    <>
      <span hidden ref={attachHost} />
      {host && createPortal(toaster, host)}
    </>
  );
}

export { toast };
