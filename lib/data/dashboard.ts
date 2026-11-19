import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listRecentOperations, type Movement } from "@/lib/data/stock";
import { isStockStatus, type StockStatus, type StockUnit } from "@/lib/stock";

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

export type DashboardMovement = Movement;

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

  // Independent queries run in parallel.
  const [itemsRes, categoriesRes, recentMovements, recentWastage] = await Promise.all([
    supabase
      .from("item_stock_overview")
      .select(
        "id, name, sku, unit, quantity, min_stock, stock_status, expired_quantity, expiring_quantity, next_expiration_date",
      )
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    listRecentOperations({ limit: 8 }),
    listRecentOperations({ type: "wastage", limit: 5 }),
  ]);

  const firstError = itemsRes.error ?? categoriesRes.error;
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
    recentMovements,
    recentWastage,
  };
}
