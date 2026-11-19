import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/navigation";
import { can, type AppRole } from "@/lib/permissions";

const QUICK_ACTION_HREFS = ["/stock-usage", "/wastage", "/stock-in", "/inventory"];

/** Shortcuts to the most frequent tasks, filtered by role. */
export function QuickActions({ role }: { role: AppRole }) {
  const actions = NAV_ITEMS.filter((i) => QUICK_ACTION_HREFS.includes(i.href) && can(role, i.permission));
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ href, label, icon: Icon, available }) =>
        available ? (
          <Button key={href} asChild variant="outline" size="sm">
            <Link href={href}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          </Button>
        ) : (
          <Button key={href} variant="outline" size="sm" disabled title="Coming in a later phase">
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Button>
        ),
      )}
    </div>
  );
}
