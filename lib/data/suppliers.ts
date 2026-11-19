import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StockUnit } from "@/lib/stock";

/* All reads run as the signed-in user, so RLS applies to every query. */

export type SupplierListRow = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  itemCount: number;
};

export async function listSuppliers({ q, archived }: { q: string; archived: boolean }): Promise<SupplierListRow[]> {
  const supabase = await createClient();
  let request = supabase
    .from("suppliers")
    .select("id, name, contact_person, phone, email, is_active, items(count)")
    .eq("is_active", !archived)
    .order("name");
  // q is sanitised by the caller (no PostgREST operator characters).
  if (q) request = request.or(`name.ilike.*${q}*,contact_person.ilike.*${q}*,email.ilike.*${q}*`);

  const { data, error } = await request;
  if (error) {
    console.error("listSuppliers failed:", error);
    throw new Error("Could not load suppliers.");
  }
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contact_person,
    phone: s.phone,
    email: s.email,
    isActive: s.is_active,
    itemCount: s.items[0]?.count ?? 0,
  }));
}

export async function getSupplier(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, contact_person, phone, email, address, notes, is_active, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getSupplier failed:", error);
    throw new Error("Could not load this supplier.");
  }
  return data;
}

/** Items that list this supplier as their preferred supplier. */
export async function getSupplierItems(supplierId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, name, sku, unit, quantity, is_active")
    .eq("supplier_id", supplierId)
    .order("name");
  if (error) throw new Error("Could not load this supplier's items.");
  return data ?? [];
}

export type SupplierPurchase = {
  batchId: string;
  receivedAt: string;
  itemId: string;
  itemName: string;
  unit: StockUnit;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  batchNumber: string | null;
  expirationDate: string | null;
};

/**
 * Purchase history = the stock batches received from this supplier. Every
 * Stock In creates exactly one batch, so no separate "purchases" table is
 * needed and the two can never disagree.
 */
export async function getSupplierPurchases(supplierId: string, limit = 50) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("stock_batches")
    .select(
      "id, received_at, received_quantity, unit_cost, batch_number, expiration_date, item:items(id, name, unit)",
      { count: "exact" },
    )
    .eq("supplier_id", supplierId)
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load purchase history.");

  const purchases: SupplierPurchase[] = (data ?? []).map((b) => ({
    batchId: b.id,
    receivedAt: b.received_at,
    itemId: b.item?.id ?? "",
    itemName: b.item?.name ?? "Unknown item",
    unit: b.item?.unit ?? "pcs",
    quantity: b.received_quantity,
    unitCost: b.unit_cost,
    // Rounded to cents for display; the exact values stay in the database.
    totalCost: b.unit_cost === null ? null : Math.round(b.unit_cost * b.received_quantity * 100) / 100,
    batchNumber: b.batch_number,
    expirationDate: b.expiration_date,
  }));

  return { purchases, total: count ?? purchases.length };
}
