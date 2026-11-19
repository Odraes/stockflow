import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Brand } from "@/components/layout/brand";
import { NavLinks } from "@/components/layout/nav-links";
import type { CurrentUser } from "@/lib/auth";
import { navItemsFor } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/permissions";

/**
 * Top bar for signed-in users. Phase 4 replaces the inline links with the
 * full sidebar; the role filtering (navItemsFor) stays the same.
 */
export function AppHeader({ user }: { user: CurrentUser }) {
  const links = navItemsFor(user.role)
    .filter((item) => item.available)
    .map(({ href, label }) => ({ href, label }));

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
        <Brand />
        <div className="min-w-0 flex-1">
          <NavLinks items={links} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.fullName ?? user.email}</p>
            <Badge variant="secondary" className="mt-0.5">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
          <ThemeSwitcher />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
