import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MovementType, StockUnit } from "@/lib/stock";
import { startOfCafeDay, startOfNextCafeDay } from "@/lib/timezone";

/* All reads run as the signed-in user, so RLS applies to every query. */

// -------------------------------------------------------- form options ---

export type StockItemOption = {
  id: string;
  name: string;
  sku: string;
  unit: StockUnit;
  quantity: number;
  /** Stock that is not expired (what usage may consume). */
  usable: number;
  isActive: boolean;
  supplierId: string | null;
};

/**
 * Items for the stock forms. `includeArchived` adds archived items that still
 * hold stock (wastage and adjustments may write those off).
 */
export async function listStockItemOptions({ includeArchived = false } = {}): Promise<StockItemOption[]> {
  const supabase = await createClient();
  let request = supabase
    .from("item_stock_overview")
    .select("id, name, sku, unit, quantity, expired_quantity, is_active, supplier_id")
    .order("name");
  request = includeArchived ? request.or("is_active.eq.true,quantity.gt.0") : request.eq("is_active", true);

  const { data, error } = await request;
  if (error) throw new Error("Could not load items.");
  return (data ?? []).flatMap((r) =>
    r.id && r.name && r.sku && r.unit
      ? [
          {
            id: r.id,
            name: r.name,
            sku: r.sku,
            unit: r.unit,
            quantity: r.quantity ?? 0,
            usable: Math.max(0, (r.quantity ?? 0) - (r.expired_quantity ?? 0)),
            isActive: r.is_active ?? true,
            supplierId: r.supplier_id,
          },
        ]
      : [],
  );
}

export type OpenBatch = {
  id: string;
  itemId: string;
  batchNumber: string | null;
  remaining: number;
  expirationDate: string | null;
  receivedAt: string;
};

/** Batches that still hold stock, in FEFO order (for the wastage batch picker). */
export async function listOpenBatches(): Promise<OpenBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_batches")
    .select("id, item_id, batch_number, remaining_quantity, expiration_date, received_at")
    .gt("remaining_quantity", 0)
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .order("received_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error("Could not load batches.");
  return (data ?? []).map((b) => ({
    id: b.id,
    itemId: b.item_id,
    batchNumber: b.batch_number,
    remaining: b.remaining_quantity,
    expirationDate: b.expiration_date,
    receivedAt: b.received_at,
  }));
}

export async function listActiveSupplierOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("id, name").eq("is_active", true).order("name");
  if (error) throw new Error("Could not load suppliers.");
  return data ?? [];
}

// ------------------------------------------------------------ movements ---

const MOVEMENT_COLUMNS =
  "id, operation_id, type, quantity_change, previous_quantity, resulting_quantity, reason, note, occurred_at, created_at, item:items(id, name, sku, unit), user:profiles(full_name), supplier:suppliers(name), batch:stock_batches(batch_number, expiration_date)";

type MovementRow = {
  id: string;
  operation_id: string;
  type: MovementType;
  quantity_change: number;
  previous_quantity: number;
  resulting_quantity: number;
  reason: string | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
  item: { id: string; name: string; sku: string; unit: StockUnit } | null;
  user: { full_name: string | null } | null;
  supplier: { name: string } | null;
  batch: { batch_number: string | null; expiration_date: string | null } | null;
};

export type Movement = {
  id: string;
  operationId: string;
  type: MovementType;
  itemId: string;
  itemName: string;
  itemSku: string;
  unit: StockUnit;
  quantityChange: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string | null;
  note: string | null;
  userName: string;
  supplierName: string | null;
  batchNumber: string | null;
  batchExpiry: string | null;
  occurredAt: string;
  createdAt: string;
};

function toMovement(r: MovementRow): Movement {
  return {
    id: r.id,
    operationId: r.operation_id,
    type: r.type,
    itemId: r.item?.id ?? "",
    itemName: r.item?.name ?? "Unknown item",
    itemSku: r.item?.sku ?? "",
    unit: r.item?.unit ?? "pcs",
    quantityChange: r.quantity_change,
    previousQuantity: r.previous_quantity,
    resultingQuantity: r.resulting_quantity,
    reason: r.reason,
    note: r.note,
    userName: r.user?.full_name ?? "Unnamed user",
    supplierName: r.supplier?.name ?? null,
    batchNumber: r.batch?.batch_number ?? null,
    batchExpiry: r.batch?.expiration_date ?? null,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  };
}

/**
 * One usage that drew from two batches is stored as two rows sharing an
 * operation_id. For human-readable feeds we merge them back into one entry.
 */
export function groupByOperation(movements: Movement[]): Movement[] {
  const byOperation = new Map<string, Movement>();
  for (const m of movements) {
    const existing = byOperation.get(m.operationId);
    if (!existing) {
      byOperation.set(m.operationId, { ...m });
      continue;
    }
    existing.quantityChange += m.quantityChange;
    // Rows are newest first, so the later row holds the starting balance.
    existing.previousQuantity = m.previousQuantity;
    existing.batchNumber = null; // several batches
    existing.batchExpiry = null;
  }
  return [...byOperation.values()];
}

/** Latest operations, optionally of one type (for "recent" panels). */
export async function listRecentOperations({ type, limit = 8 }: { type?: MovementType; limit?: number } = {}) {
  const supabase = await createClient();
  let request = supabase.from("stock_movements").select(MOVEMENT_COLUMNS).order("created_at", { ascending: false });
  if (type) request = request.eq("type", type);
  const { data, error } = await request.limit(limit * 4);
  if (error) throw new Error("Could not load recent stock movements.");
  return groupByOperation(((data ?? []) as MovementRow[]).map(toMovement)).slice(0, limit);
}

export type MovementQuery = {
  type: MovementType | null;
  itemId: string | null;
  from: string | null; // YYYY-MM-DD (café time zone)
  to: string | null;
  page: number;
};

export const MOVEMENTS_PAGE_SIZE = 25;

/** Full audit log: every row, newest first, filtered and paginated. */
export async function listMovements(query: MovementQuery): Promise<{ rows: Movement[]; total: number }> {
  const supabase = await createClient();
  const from = (query.page - 1) * MOVEMENTS_PAGE_SIZE;

  let request = supabase.from("stock_movements").select(MOVEMENT_COLUMNS, { count: "exact" });
  if (query.type) request = request.eq("type", query.type);
  if (query.itemId) request = request.eq("item_id", query.itemId);
  if (query.from) request = request.gte("occurred_at", startOfCafeDay(query.from).toISOString());
  if (query.to) request = request.lt("occurred_at", startOfNextCafeDay(query.to).toISOString());

  const { data, error, count } = await request
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, from + MOVEMENTS_PAGE_SIZE - 1);

  if (error?.code === "PGRST103") {
    const first = await listMovements({ ...query, page: 1 });
    return { rows: [], total: first.total };
  }
  if (error) {
    console.error("listMovements failed:", error);
    throw new Error("Could not load transactions.");
  }
  return { rows: ((data ?? []) as MovementRow[]).map(toMovement), total: count ?? 0 };
}
