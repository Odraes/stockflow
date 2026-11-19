import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { requireActiveUser } from "@/lib/auth";

/**
 * Layout for every page that requires an approved account.
 *
 * `(app)` is a "route group": the parentheses keep it out of the URL, so
 * app/(app)/dashboard/page.tsx is served at /dashboard.
 *
 * With Cache Components enabled, anything that reads cookies (the session)
 * must render inside <Suspense>. The fallback is what users see for the
 * split second while the session is checked.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  // Redirects to /auth/login or /pending when needed.
  const user = await requireActiveUser();

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="h-16 border-b" />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
