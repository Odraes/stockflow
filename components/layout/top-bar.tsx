import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Brand } from "@/components/layout/brand";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { CurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";

export function TopBar({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <MobileNav role={user.role} />
      <div className="md:hidden">
        <Brand />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{user.fullName ?? user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
        <ThemeSwitcher />
        <LogoutButton />
      </div>
    </header>
  );
}
