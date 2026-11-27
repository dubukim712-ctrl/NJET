export function ProductStockBadge({
  available,
  children,
}: {
  available: boolean;
  children: React.ReactNode;
}) {
  const colors = available
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200";

  return (
    <span
      className={`inline-flex max-w-full rounded-md border px-2 py-1 min-[375px]:max-[768px]:text-[8px] text-xs font-semibold ${colors}`}
    >
      {children}
    </span>
  );
}
