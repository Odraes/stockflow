import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isStockStatus, type MovementType, type StockStatus, type StockUnit } from "@/lib/stock";
import { PAGE_SIZE, type InventoryQuery } from "@/lib/validations/inventory-query";

/* All reads run as the signed-in user, so RLS applies to every query. */

export type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  unit: StockUnit;
  quantity: number;
  minStock: number;
  location: string | null;
  isActive: boolean;
  categoryName: string;
  supplierName: string | null;
  status: StockStatus;
  expiredQuantity: number;
  expiringQuantity: number;
  nextExpirationDate: string | null;
  updatedAt: string;
};

export type Option = { id: string; name: string };

export async function listInventory(query: InventoryQuery): Promise<{ rows: InventoryRow[]; total: number }> {
  const supabase = await createClient();
  const from = (query.page - 1) * PAGE_SIZE;

  let request = supabase
    .from("item_stock_overview")
    .select("*", { count: "exact" })
    .eq("is_active", !query.archived);

  if (query.q) request = request.or(`name.ilike.*${query.q}*,sku.ilike.*${query.q}*`);
  if (query.category) request = request.eq("category_id", query.category);

  switch (query.status) {
    case "in_stock":
    case "low_stock":
    case "out_of_stock":
      request = request.eq("stock_status", query.status);
      break;
    case "near_expiry":
      request = request.gt("expiring_quantity", 0);
      break;
    case "expired":
      request = request.gt("expired_quantity", 0);
      break;
  }

  const { data, error, count } = await request
    .order(query.sort, { ascending: query.dir === "asc" })
    .order("id") // stable order across pages when sort values tie
    .range(from, from + PAGE_SIZE - 1);

  if (error?.code === "PGRST103") {
    // The requested page is past the last result (e.g. ?page=999). PostgREST
    // reports that as an error; we treat it as "no rows on this page" and
    // still return the real total (from page 1) so the UI can offer a way back.
    const firstPage = await listInventory({ ...query, page: 1 });
    return { rows: [], total: firstPage.total };
  }
  if (error) {
    console.error("listInventory failed:", error);
    throw new Error("Could not load inventory.");
  }

  const rows = (data ?? []).flatMap((r): InventoryRow[] =>
    r.id && r.name && r.sku && r.unit && isStockStatus(r.stock_status)
      ? [
          {
            id: r.id,
            name: r.name,
            sku: r.sku,
            unit: r.unit,
            quantity: r.quantity ?? 0,
            minStock: r.min_stock ?? 0,
            location: r.location,
            isActive: r.is_active ?? true,
            categoryName: r.category_name ?? "—",
            supplierName: r.supplier_name,
            status: r.stock_status,
            expiredQuantity: r.expired_quantity ?? 0,
            expiringQuantity: r.expiring_quantity ?? 0,
            nextExpirationDate: r.next_expiration_date,
            updatedAt: r.updated_at ?? "",
          },
        ]
      : [],
  );

  return { rows, total: count ?? 0 };
}

export async function getItem(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(
      "id, name, sku, description, category_id, supplier_id, unit, quantity, min_stock, location, is_active, created_at, updated_at, category:categories(name), supplier:suppliers(name), creator:profiles(full_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getItem failed:", error);
    throw new Error("Could not load this item.");
  }
  return data; // null when not found (or not visible under RLS)
}

export type ItemDetail = NonNullable<Awaited<ReturnType<typeof getItem>>>;

export async function getItemStatus(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("item_stock_overview")
    .select("stock_status, expired_quantity, expiring_quantity, next_expiration_date")
    .eq("id", id)
    .maybeSingle();
  return {
    status: isStockStatus(data?.stock_status) ? data.stock_status : null,
    expiredQuantity: data?.expired_quantity ?? 0,
    expiringQuantity: data?.expiring_quantity ?? 0,
  };
}

export async function getItemBatches(itemId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_batches")
    .select("id, batch_number, received_quantity, remaining_quantity, unit_cost, expiration_date, received_at, supplier:suppliers(name)")
    .eq("item_id", itemId)
    .gt("remaining_quantity", 0)
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .order("received_at", { ascending: true });
  if (error) throw new Error("Could not load batches.");
  return data ?? [];
}

export type ItemMovement = {
  id: string;
  type: MovementType;
  quantityChange: number;
  resultingQuantity: number;
  reason: string | null;
  note: string | null;
  occurredAt: string;
  userName: string;
};

export async function getItemMovements(itemId: string, limit = 15): Promise<ItemMovement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, type, quantity_change, resulting_quantity, reason, note, occurred_at, user:profiles(full_name)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load stock history.");
  return (data ?? []).map((m) => ({
    id: m.id,
    type: m.type,
    quantityChange: m.quantity_change,
    resultingQuantity: m.resulting_quantity,
    reason: m.reason,
    note: m.note,
    occurredAt: m.occurred_at,
    userName: m.user?.full_name ?? "Unknown user",
  }));
}

export async function itemHasHistory(itemId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);
  return (count ?? 0) > 0;
}

export async function listCategoryOptions(): Promise<Option[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw new Error("Could not load categories.");
  return data ?? [];
}

/** Active suppliers, plus the currently selected one even if archived. */
export async function listSupplierOptions(includeId?: string | null): Promise<Option[]> {
  const supabase = await createClient();
  let request = supabase.from("suppliers").select("id, name").order("name");
  request = includeId ? request.or(`is_active.eq.true,id.eq.${includeId}`) : request.eq("is_active", true);
  const { data, error } = await request;
  if (error) throw new Error("Could not load suppliers.");
  return data ?? [];
}
