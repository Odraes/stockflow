"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { formatQuantity, type StockUnit } from "@/lib/stock";
import { createClient } from "@/lib/supabase/server";
import {
  parseAdjust,
  parseReceive,
  parseUsage,
  parseWastage,
  readForm,
  type StockFieldErrors,
  type StockFormValues,
} from "@/lib/validations/stock";

/*
 * Server Actions for stock operations. Each one:
 *   1. checks the caller's permission on the server,
 *   2. validates the form,
 *   3. calls ONE database function (receive_stock, record_usage, ...) that
 *      re-checks permissions, locks the item row and writes the batch and
 *      movement rows in a single transaction.
 * The app never writes quantities, batches or movements directly.
 */

export type StockFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: StockFieldErrors;
  values?: StockFormValues;
  /** Item to link to after a successful operation. */
  itemId?: string;
};

type Movement = { item_id: string; quantity_change: number; resulting_quantity: number };
type DbError = { code?: string; message: string; hint?: string | null };

function failure(error: DbError, values: StockFormValues): StockFormState {
  // Insufficient stock: show it next to the quantity field.
  if (error.code === "SP001") {
    return { values, fieldErrors: { quantity: friendlyDbError(error), new_quantity: friendlyDbError(error) } };
  }
  return { values, message: friendlyDbError(error) };
}

function refresh(itemId: string) {
  for (const path of ["/dashboard", "/inventory", `/inventory/${itemId}`, "/transactions", "/stock-in", "/stock-usage", "/wastage", "/suppliers"]) {
    revalidatePath(path);
  }
}

/** "Received 1,000 ml. New balance: 2,500 ml." from the rows the function returned. */
function summary(verb: string, rows: Movement[], unit: StockUnit) {
  const moved = Math.abs(rows.reduce((sum, r) => sum + r.quantity_change, 0));
  const balance = rows.length ? rows[rows.length - 1].resulting_quantity : 0;
  const batches = rows.length > 1 ? ` from ${rows.length} batches (first-expired-first-out)` : "";
  return `${verb} ${formatQuantity(moved, unit)}${batches}. New balance: ${formatQuantity(balance, unit)}.`;
}

export async function receiveStockAction(_prev: StockFormState, formData: FormData): Promise<StockFormState> {
  await requirePermission("stock:receive");
  const values = readForm(formData);
  const parsed = parseReceive(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("receive_stock", {
    p_item_id: d.item_id,
    p_quantity: d.quantity,
    p_unit: d.unit,
    p_supplier_id: d.supplier_id ?? undefined,
    p_unit_cost: d.unit_cost ?? undefined,
    p_total_cost: d.total_cost ?? undefined,
    p_batch_number: d.batch_number ?? undefined,
    p_expiration_date: d.expiration_date ?? undefined,
    p_note: d.note ?? undefined,
    p_received_at: d.occurred_at ?? undefined,
  });
  if (error) return failure(error, values);

  refresh(d.item_id);
  return { ok: true, itemId: d.item_id, message: summary("Received", data ?? [], d.unit) };
}

export async function recordUsageAction(_prev: StockFormState, formData: FormData): Promise<StockFormState> {
  await requirePermission("stock:use");
  const values = readForm(formData);
  const parsed = parseUsage(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_usage", {
    p_item_id: d.item_id,
    p_quantity: d.quantity,
    p_unit: d.unit,
    p_reason: d.reason ?? undefined,
    p_note: d.note ?? undefined,
    p_occurred_at: d.occurred_at ?? undefined,
  });
  if (error) return failure(error, values);

  refresh(d.item_id);
  return { ok: true, itemId: d.item_id, message: summary("Used", data ?? [], d.unit) };
}

export async function recordWastageAction(_prev: StockFormState, formData: FormData): Promise<StockFormState> {
  await requirePermission("stock:waste");
  const values = readForm(formData);
  const parsed = parseWastage(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_wastage", {
    p_item_id: d.item_id,
    p_quantity: d.quantity,
    p_unit: d.unit,
    p_reason: d.reason,
    p_note: d.note ?? undefined,
    p_batch_id: d.batch_id ?? undefined,
    p_occurred_at: d.occurred_at ?? undefined,
  });
  if (error) return failure(error, values);

  refresh(d.item_id);
  return { ok: true, itemId: d.item_id, message: summary("Recorded wastage of", data ?? [], d.unit) };
}

export async function adjustStockAction(_prev: StockFormState, formData: FormData): Promise<StockFormState> {
  await requirePermission("stock:adjust");
  const values = readForm(formData);
  const parsed = parseAdjust(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_item_id: d.item_id,
    p_new_quantity: d.new_quantity,
    p_unit: d.unit,
    p_reason: d.reason,
    p_note: d.note ?? undefined,
    p_expiration_date: d.expiration_date ?? undefined,
  });
  if (error) return failure(error, values);

  refresh(d.item_id);
  const rows = data ?? [];
  const change = rows.reduce((sum, r) => sum + r.quantity_change, 0);
  return {
    ok: true,
    itemId: d.item_id,
    message: `Stock ${change > 0 ? "increased" : "decreased"} by ${formatQuantity(Math.abs(change), d.unit)} to ${formatQuantity(d.new_quantity, d.unit)}.`,
  };
}
