import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome{user.fullName ? `, ${user.fullName}` : ""}
      </h1>
      <p className="text-muted-foreground">
        You are signed in as <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>.
        Inventory statistics will appear here once the dashboard is built (Phase 4).
      </p>
    </div>
  );
}
