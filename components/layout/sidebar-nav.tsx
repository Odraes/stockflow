"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemsFor } from "@/lib/navigation";
import type { AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * The role-filtered menu. It is a Client Component because it highlights the
 * current page (usePathname). Hiding links is only for convenience: every
 * page checks permissions again on the server.
 */
export function SidebarNav({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navItemsFor(role);

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon, available }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const base = "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";

        if (!available) {
          return (
            <span
              key={href}
              aria-disabled="true"
              title="Coming in a later phase"
              className={cn(base, "cursor-not-allowed text-muted-foreground/60")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              base,
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
