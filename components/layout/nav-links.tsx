"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavLinkItem = { href: string; label: string };

/**
 * Client component only because it needs the current URL (usePathname) to
 * highlight the active link. The list itself is decided on the server.
 */
export function NavLinks({ items }: { items: NavLinkItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
