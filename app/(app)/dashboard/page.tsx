import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Boxes, CalendarClock, PackageX, Scale, Tags } from "lucide-react";
import { ExpiryList } from "@/components/dashboard/expiry-list";
import { MovementList } from "@/components/dashboard/movement-list";
import { Panel } from "@/components/dashboard/panel";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { StockAlertList } from "@/components/dashboard/stock-alert-list";
import { requirePermission, type CurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { formatQuantity, NEAR_EXPIRY_DAYS } from "@/lib/stock";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Café inventory at a glance · signed in as {ROLE_LABELS[user.role]}
          </p>
        </div>
        <QuickActions role={user.role} />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent user={user} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ user }: { user: CurrentUser }) {
  const data = await getDashboardData();
  const alerts = [...data.outOfStock, ...data.lowStock];
  const canManage = can(user.role, "inventory:manage");

  return (
    <div className="space-y-6">
      {data.totalItems === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm">
          <p className="font-medium">Your inventory is empty</p>
          <p className="mt-1 text-muted-foreground">
            {canManage
              ? "Add your ingredients and supplies, and the statistics below will fill in automatically."
              : "A manager or administrator needs to add inventory items first."}
          </p>
          {canManage && (
            <Link href="/inventory/new" className="mt-3 inline-block font-medium text-primary underline-offset-4 hover:underline">
              Add your first item →
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Inventory items" value={data.totalItems} hint="Active items" icon={Boxes} />
        <StatCard label="Categories" value={data.totalCategories} icon={Tags} />
        <StatCard
          label="Available stock"
          icon={Scale}
          hint="Totals per unit — different units are never added together"
          value={
            data.stockByUnit.length === 0 ? (
              "—"
            ) : (
              <span className="flex flex-wrap gap-x-3 text-lg">
                {data.stockByUnit.map(({ unit, quantity }) => (
                  <span key={unit}>{formatQuantity(quantity, unit)}</span>
                ))}
              </span>
            )
          }
        />
        <StatCard
          label="Low stock"
          value={data.lowStock.length}
          hint="At or below minimum level"
          icon={AlertTriangle}
          tone={data.lowStock.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Out of stock"
          value={data.outOfStock.length}
          icon={PackageX}
          tone={data.outOfStock.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Expiring or expired"
          value={data.expiring.length + data.expired.length}
          hint={`${data.expired.length} expired · ${data.expiring.length} within ${NEAR_EXPIRY_DAYS} days`}
          icon={CalendarClock}
          tone={data.expired.length > 0 ? "danger" : data.expiring.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Stock alerts" isEmpty={alerts.length === 0} empty="Everything is above its minimum level.">
          <StockAlertList items={alerts} />
        </Panel>
        <Panel
          title="Expiration watch"
          isEmpty={data.expired.length + data.expiring.length === 0}
          empty={`Nothing is expired or expiring in the next ${NEAR_EXPIRY_DAYS} days.`}
        >
          <ExpiryList expired={data.expired} expiring={data.expiring} />
        </Panel>
        <Panel
          title="Recent transactions"
          isEmpty={data.recentMovements.length === 0}
          empty="No stock movements recorded yet."
        >
          <MovementList movements={data.recentMovements} />
        </Panel>
        <Panel title="Recent wastage" isEmpty={data.recentWastage.length === 0} empty="No wastage recorded yet.">
          <MovementList movements={data.recentWastage} />
        </Panel>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
