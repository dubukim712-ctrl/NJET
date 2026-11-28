export default function LoadingAdminSession() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center border-b px-4 text-lg font-bold sm:px-6">Admin Portal</header>
      <p role="status" className="p-4 text-sm text-muted-foreground sm:p-6">Checking admin access…</p>
    </div>
  );
}
