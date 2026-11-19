import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isStockStatus, type MovementType, type StockStatus, type StockUnit } from "@/lib/stock";

/*
 * Dashboard queries. Everything runs with the signed-in user's session, so
 * RLS decides what they can see — this file never bypasses it.
 *
 * A café inventory is small (hundreds of items, not millions), so we load the
 * active items once and compute the counts here instead of running one SQL
 * query per statistic.
 */

export type DashboardItem = {
  id: string;
  name: string;
  sku: string;
  unit: StockUnit;
  quantity: number;
  minStock: number;
  status: StockStatus;
  expiredQuantity: number;
  expiringQuantity: number;
  nextExpirationDate: string | null;
};

export type DashboardMovement = {
  operationId: string;
  type: MovementType;
  itemName: string;
  unit: StockUnit;
  quantityChange: number;
  reason: string | null;
  userName: string;
  occurredAt: string;
};

export type DashboardData = {
  totalItems: number;
  totalCategories: number;
  stockByUnit: { unit: StockUnit; quantity: number }[];
  lowStock: DashboardItem[];
  outOfStock: DashboardItem[];
  expiring: DashboardItem[];
  expired: DashboardItem[];
  recentMovements: DashboardMovement[];
  recentWastage: DashboardMovement[];
};

const UNIT_ORDER: StockUnit[] = ["g", "ml", "pcs"];

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const movementColumns =
    "operation_id, type, quantity_change, reason, occurred_at, created_at, item:items(name, unit), user:profiles(full_name)";

  // Independent queries run in parallel.
  const [itemsRes, categoriesRes, movementsRes, wastageRes] = await Promise.all([
    supabase
      .from("item_stock_overview")
      .select(
        "id, name, sku, unit, quantity, min_stock, stock_status, expired_quantity, expiring_quantity, next_expiration_date",
      )
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("stock_movements").select(movementColumns).order("created_at", { ascending: false }).limit(30),
    supabase
      .from("stock_movements")
      .select(movementColumns)
      .eq("type", "wastage")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const firstError = itemsRes.error ?? categoriesRes.error ?? movementsRes.error ?? wastageRes.error;
  if (firstError) {
    console.error("Dashboard query failed:", firstError);
    throw new Error("Could not load the dashboard. Please refresh the page.");
  }

  // The view's columns are typed as nullable (Postgres can't prove otherwise
  // for views), so we normalise them once here.
  const items: DashboardItem[] = (itemsRes.data ?? []).flatMap((row) =>
    row.id && row.name && row.sku && row.unit && isStockStatus(row.stock_status)
      ? [
          {
            id: row.id,
            name: row.name,
            sku: row.sku,
            unit: row.unit,
            quantity: row.quantity ?? 0,
            minStock: row.min_stock ?? 0,
            status: row.stock_status,
            expiredQuantity: row.expired_quantity ?? 0,
            expiringQuantity: row.expiring_quantity ?? 0,
            nextExpirationDate: row.next_expiration_date,
          },
        ]
      : [],
  );

  const totals = new Map<StockUnit, number>();
  for (const item of items) totals.set(item.unit, (totals.get(item.unit) ?? 0) + item.quantity);

  return {
    totalItems: items.length,
    totalCategories: categoriesRes.count ?? 0,
    stockByUnit: UNIT_ORDER.filter((u) => totals.has(u)).map((unit) => ({ unit, quantity: totals.get(unit) ?? 0 })),
    lowStock: items.filter((i) => i.status === "low_stock"),
    outOfStock: items.filter((i) => i.status === "out_of_stock"),
    expiring: items
      .filter((i) => i.expiringQuantity > 0)
      .sort((a, b) => (a.nextExpirationDate ?? "").localeCompare(b.nextExpirationDate ?? "")),
    expired: items.filter((i) => i.expiredQuantity > 0),
    recentMovements: groupByOperation(movementsRes.data ?? []).slice(0, 8),
    recentWastage: groupByOperation(wastageRes.data ?? []).slice(0, 5),
  };
}

type MovementRow = {
  operation_id: string;
  type: MovementType;
  quantity_change: number;
  reason: string | null;
  occurred_at: string;
  item: { name: string; unit: StockUnit } | null;
  user: { full_name: string | null } | null;
};

/**
 * One usage that drew from two batches is stored as two rows sharing an
 * operation_id. For a human-readable feed we merge them back into one line.
 */
function groupByOperation(rows: MovementRow[]): DashboardMovement[] {
  const byOperation = new Map<string, DashboardMovement>();
  for (const row of rows) {
    const existing = byOperation.get(row.operation_id);
    if (existing) {
      existing.quantityChange += row.quantity_change;
      continue;
    }
    byOperation.set(row.operation_id, {
      operationId: row.operation_id,
      type: row.type,
      itemName: row.item?.name ?? "Unknown item",
      unit: row.item?.unit ?? "pcs",
      quantityChange: row.quantity_change,
      reason: row.reason,
      userName: row.user?.full_name ?? "Unknown user",
      occurredAt: row.occurred_at,
    });
  }
  return [...byOperation.values()];
}
