"use client";

import { Toaster, toast, type ToasterProps } from "sonner";

export type ToastProviderProps = ToasterProps;

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
  return (
    <Toaster
      {...props}
      closeButton={closeButton}
      mobileOffset={mobileOffset}
      position={position}
      richColors={richColors}
      theme={theme}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: `font-sans ${toastOptions?.classNames?.toast ?? ""}`.trim(),
          title: `text-sm font-semibold ${toastOptions?.classNames?.title ?? ""}`.trim(),
          description: `text-sm leading-5 ${toastOptions?.classNames?.description ?? ""}`.trim(),
        },
      }}
      visibleToasts={visibleToasts}
    />
  );
}

export { toast };
