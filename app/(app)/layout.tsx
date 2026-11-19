import { Suspense } from "react";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
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
    <div className="min-h-svh bg-muted/40">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r bg-card px-3 py-4 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <SidebarNav role={user.role} />
      </aside>
      <div className="flex min-h-svh flex-col md:pl-60">
        <TopBar user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-svh bg-muted/40">
      <div className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card md:block" />
      <div className="md:pl-60">
        <div className="h-16 border-b bg-background" />
        <div className="space-y-4 px-4 py-8 md:px-8">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
