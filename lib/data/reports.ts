import "server-only";

import { formatMoney } from "@/lib/format";
import { addDays, type ReportQuery } from "@/lib/reports/query";
import { isStockStatus, STOCK_STATUS, type StockUnit } from "@/lib/stock";
import { createClient } from "@/lib/supabase/server";
import { startOfCafeDay, startOfNextCafeDay, todayInCafe } from "@/lib/timezone";

/*
 * Every report returns the same shape (columns + rows + summary), so ONE
 * table component renders them all and ONE function turns them into CSV.
 * All queries run as the signed-in user, so RLS applies.
 */

export type ColumnKind = "text" | "mono" | "integer" | "quantity" | "money" | "unitCost" | "date" | "datetime" | "badge";
export type Tone = "success" | "warning" | "danger" | "secondary" | "outline";
export type Cell = string | number | null;

export type ReportColumn = {
  key: string;
  label: string;
  kind: ColumnKind;
  /** For "quantity": the row key that holds the unit (shown next to the number). */
  unitKey?: string;
  /** For "badge": the row key that holds the badge colour. */
  toneKey?: string;
  /** Turn the cell into a link (built from the row). */
  href?: (row: ReportRow) => string | null;
  /** Hide on narrow screens. */
  hideBelow?: "sm" | "md" | "lg";
  /** Only in the CSV (e.g. a separate Unit column). */
  csvOnly?: boolean;
};

export type ReportRow = Record<string, Cell>;
export type ReportResult = { columns: ReportColumn[]; rows: ReportRow[]; summary: string[]; empty: string };

const PAGE = 1000; // Supabase returns at most 1000 rows per request

/** Fetch every page of a query (a café is small, but never silently cut at 1000 rows). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, cap = 20_000) {
  const rows: T[] = [];
  for (let from = 0; from < cap; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) {
      console.error("Report query failed:", error);
      throw new Error("Could not load the report.");
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const itemLink = (key: string) => (row: ReportRow) => (row[key] ? `/inventory/${row[key]}` : null);
const unitColumn: ReportColumn = { key: "unit", label: "Unit", kind: "text", csvOnly: true };

export async function runReport(q: ReportQuery): Promise<ReportResult> {
  switch (q.report) {
    case "inventory":
      return inventoryReport(q);
    case "low-stock":
      return lowStockReport(q);
    case "expiring":
      return expiringReport(q);
    case "movements":
      return movementsReport(q);
    case "wastage":
      return wastageReport(q);
    case "suppliers":
      return suppliersReport(q);
  }
}

// ---------------------------------------------------------- inventory ---

async function overviewRows(q: ReportQuery, statuses: string[] | null) {
  const supabase = await createClient();
  return fetchAll((from, to) => {
    let r = supabase
      .from("item_stock_overview")
      .select("id, name, sku, unit, quantity, min_stock, stock_status, category_name, supplier_name, location, expired_quantity, expiring_quantity")
      .eq("is_active", true);
    if (q.category) r = r.eq("category_id", q.category);
    if (statuses) r = r.in("stock_status", statuses);
    return r.order("name").order("id").range(from, to);
  });
}

async function inventoryReport(q: ReportQuery): Promise<ReportResult> {
  const data = await overviewRows(q, q.status === "all" ? null : [q.status]);
  const rows = data.map((r) => {
    const status = isStockStatus(r.stock_status) ? STOCK_STATUS[r.stock_status] : null;
    return {
      id: r.id,
      name: r.name,
      sku: r.sku,
      category: r.category_name,
      supplier: r.supplier_name,
      quantity: r.quantity,
      min_stock: r.min_stock,
      unit: r.unit,
      status: status?.label ?? null,
      tone: status?.tone ?? null,
      location: r.location,
    };
  });
  return {
    columns: [
      { key: "name", label: "Item", kind: "text", href: itemLink("id") },
      { key: "sku", label: "SKU", kind: "mono", hideBelow: "sm" },
      { key: "category", label: "Category", kind: "text", hideBelow: "md" },
      { key: "quantity", label: "In stock", kind: "quantity", unitKey: "unit" },
      { key: "min_stock", label: "Minimum", kind: "quantity", unitKey: "unit", hideBelow: "lg" },
      unitColumn,
      { key: "status", label: "Status", kind: "badge", toneKey: "tone" },
      { key: "supplier", label: "Preferred supplier", kind: "text", hideBelow: "lg" },
      { key: "location", label: "Location", kind: "text", hideBelow: "lg" },
    ],
    rows,
    summary: [`${rows.length} item${rows.length === 1 ? "" : "s"}`],
    empty: "No active items match these filters.",
  };
}

async function lowStockReport(q: ReportQuery): Promise<ReportResult> {
  const data = await overviewRows(q, ["low_stock", "out_of_stock"]);
  const rows = data
    .map((r) => {
      const qty = r.quantity ?? 0;
      const min = r.min_stock ?? 0;
      const status = isStockStatus(r.stock_status) ? STOCK_STATUS[r.stock_status] : null;
      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        category: r.category_name,
        supplier: r.supplier_name,
        quantity: qty,
        min_stock: min,
        shortfall: Math.max(0, Math.round((min - qty) * 1000) / 1000),
        unit: r.unit,
        status: status?.label ?? null,
        tone: status?.tone ?? null,
        out: r.stock_status === "out_of_stock" ? 0 : 1,
      };
    })
    .sort((a, b) => a.out - b.out || b.shortfall - a.shortfall);
  return {
    columns: [
      { key: "name", label: "Item", kind: "text", href: itemLink("id") },
      { key: "sku", label: "SKU", kind: "mono", hideBelow: "md" },
      { key: "quantity", label: "In stock", kind: "quantity", unitKey: "unit" },
      { key: "min_stock", label: "Minimum", kind: "quantity", unitKey: "unit", hideBelow: "sm" },
      { key: "shortfall", label: "Needed to reach minimum", kind: "quantity", unitKey: "unit" },
      unitColumn,
      { key: "status", label: "Status", kind: "badge", toneKey: "tone" },
      { key: "supplier", label: "Preferred supplier", kind: "text", hideBelow: "lg" },
    ],
    rows,
    summary: [
      `${rows.filter((r) => r.out === 0).length} out of stock`,
      `${rows.filter((r) => r.out === 1).length} low`,
    ],
    empty: "Nothing is at or below its minimum level.",
  };
}

// ----------------------------------------------------------- expiring ---

async function expiringReport(q: ReportQuery): Promise<ReportResult> {
  const supabase = await createClient();
  const today = todayInCafe();
  const cutoff = addDays(today, q.days);
  const data = await fetchAll((from, to) => {
    let r = supabase
      .from("stock_batches")
      .select("id, batch_number, remaining_quantity, expiration_date, received_at, supplier:suppliers(name), item:items!inner(id, name, sku, unit, category_id, is_active)")
      .gt("remaining_quantity", 0)
      .not("expiration_date", "is", null)
      .lte("expiration_date", cutoff)
      .eq("item.is_active", true);
    if (q.category) r = r.eq("item.category_id", q.category);
    return r.order("expiration_date").order("id").range(from, to);
  });

  const msPerDay = 86_400_000;
  const rows = data.map((b) => {
    const daysLeft = Math.round((Date.parse(`${b.expiration_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / msPerDay);
    const expired = daysLeft < 0;
    return {
      item_id: b.item?.id ?? null,
      name: b.item?.name ?? null,
      sku: b.item?.sku ?? null,
      batch: b.batch_number,
      expires: b.expiration_date,
      days_left: daysLeft,
      remaining: b.remaining_quantity,
      unit: b.item?.unit ?? null,
      status: expired ? "Expired" : daysLeft === 0 ? "Expires today" : "Near expiration",
      tone: expired ? "danger" : "warning",
      supplier: b.supplier?.name ?? null,
    };
  });
  const expiredCount = rows.filter((r) => r.days_left < 0).length;
  return {
    columns: [
      { key: "name", label: "Item", kind: "text", href: itemLink("item_id") },
      { key: "batch", label: "Batch", kind: "mono", hideBelow: "sm" },
      { key: "expires", label: "Expires", kind: "date" },
      { key: "days_left", label: "Days left", kind: "integer", hideBelow: "sm" },
      { key: "remaining", label: "Remaining", kind: "quantity", unitKey: "unit" },
      unitColumn,
      { key: "status", label: "Status", kind: "badge", toneKey: "tone" },
      { key: "supplier", label: "Supplier", kind: "text", hideBelow: "lg" },
    ],
    rows,
    summary: [`${expiredCount} expired batch${expiredCount === 1 ? "" : "es"}`, `${rows.length - expiredCount} expiring within ${q.days} days`],
    empty: `Nothing is expired or expiring within ${q.days} days.`,
  };
}

// ----------------------------------------------------- period reports ---

function period(q: ReportQuery) {
  return { p_from: startOfCafeDay(q.from).toISOString(), p_to: startOfNextCafeDay(q.to).toISOString() };
}

async function movementsReport(q: ReportQuery): Promise<ReportResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_movement_summary", {
    ...period(q),
    ...(q.category ? { p_category_id: q.category } : {}),
  });
  if (error) throw new Error("Could not load the report.");

  const rows: ReportRow[] = (data ?? []).map((r) => ({
    item_id: r.item_id,
    name: r.item_name,
    sku: r.sku,
    category: r.category_name,
    received: r.received,
    used: r.used,
    wasted: r.wasted,
    adjusted: r.adjusted,
    net: r.net_change,
    unit: r.unit as StockUnit,
    cost: (r.purchase_cost as number | null) ?? null,
    uncosted: r.uncosted_receipts,
  }));
  const cost = rows.reduce((s, r) => s + ((r.cost as number | null) ?? 0), 0);
  const uncosted = rows.reduce((s, r) => s + ((r.uncosted as number) ?? 0), 0);
  return {
    columns: [
      { key: "name", label: "Item", kind: "text", href: itemLink("item_id") },
      { key: "category", label: "Category", kind: "text", hideBelow: "lg" },
      { key: "received", label: "Received", kind: "quantity", unitKey: "unit" },
      { key: "used", label: "Used", kind: "quantity", unitKey: "unit" },
      { key: "wasted", label: "Wasted", kind: "quantity", unitKey: "unit" },
      { key: "adjusted", label: "Adjusted", kind: "quantity", unitKey: "unit", hideBelow: "md" },
      { key: "net", label: "Net change", kind: "quantity", unitKey: "unit", hideBelow: "md" },
      unitColumn,
      { key: "cost", label: "Purchase cost", kind: "money", hideBelow: "sm" },
      { key: "uncosted", label: "Receipts without cost", kind: "integer", csvOnly: true },
    ],
    rows,
    summary: [
      `${rows.length} item${rows.length === 1 ? "" : "s"} with movements`,
      `${formatMoney(cost)} purchase cost${uncosted ? ` (+${uncosted} receipt${uncosted === 1 ? "" : "s"} without a price)` : ""}`,
    ],
    empty: "No stock movements in this period.",
  };
}

async function wastageReport(q: ReportQuery): Promise<ReportResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_wastage_by_reason", {
    ...period(q),
    ...(q.category ? { p_category_id: q.category } : {}),
  });
  if (error) throw new Error("Could not load the report.");

  // Share of the total wasted IN THE SAME UNIT (never comparing ml with pcs).
  const totals = new Map<string, number>();
  for (const r of data ?? []) totals.set(r.unit, (totals.get(r.unit) ?? 0) + r.quantity);
  const rows: ReportRow[] = (data ?? []).map((r) => ({
    reason: r.reason,
    quantity: r.quantity,
    unit: r.unit,
    share: Math.round((r.quantity / (totals.get(r.unit) || 1)) * 100),
    events: r.events,
    items: r.items,
  }));
  const events = rows.reduce((s, r) => s + (r.events as number), 0);
  return {
    columns: [
      { key: "reason", label: "Reason", kind: "text" },
      { key: "quantity", label: "Wasted", kind: "quantity", unitKey: "unit" },
      unitColumn,
      { key: "share", label: "% of wastage (same unit)", kind: "integer" },
      { key: "events", label: "Times recorded", kind: "integer", hideBelow: "sm" },
      { key: "items", label: "Different items", kind: "integer", hideBelow: "md" },
    ],
    rows,
    summary: [`${events} wastage record${events === 1 ? "" : "s"} in the period`],
    empty: "No wastage recorded in this period.",
  };
}

async function suppliersReport(q: ReportQuery): Promise<ReportResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_supplier_purchases", period(q));
  if (error) throw new Error("Could not load the report.");

  const rows: ReportRow[] = (data ?? []).map((r) => ({
    supplier_id: (r.supplier_id as string | null) ?? null,
    supplier: r.supplier_name,
    deliveries: r.deliveries,
    items: r.distinct_items,
    cost: (r.total_cost as number | null) ?? null,
    uncosted: r.uncosted_deliveries,
    last: r.last_delivery,
  }));
  const cost = rows.reduce((s, r) => s + ((r.cost as number | null) ?? 0), 0);
  return {
    columns: [
      { key: "supplier", label: "Supplier", kind: "text", href: (r) => (r.supplier_id ? `/suppliers/${r.supplier_id}` : null) },
      { key: "deliveries", label: "Deliveries", kind: "integer" },
      { key: "items", label: "Different items", kind: "integer", hideBelow: "sm" },
      { key: "cost", label: "Total cost", kind: "money" },
      { key: "uncosted", label: "Deliveries without price", kind: "integer", hideBelow: "md" },
      { key: "last", label: "Last delivery", kind: "datetime", hideBelow: "lg" },
    ],
    rows,
    summary: [`${formatMoney(cost)} total purchase cost`],
    empty: "No deliveries recorded in this period.",
  };
}
