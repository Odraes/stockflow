import type { StockUnit } from "@/lib/stock";
import { isUuid } from "@/lib/validations/common";
import { STOCK_UNITS } from "@/lib/validations/item";

/**
 * Validation for the stock forms. The database functions validate again
 * (and are the real authority), but checking here gives friendly per-field
 * messages before any database call.
 */

export type StockFormValues = Record<string, string>;
export type StockFieldErrors = Partial<Record<string, string>>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: StockFieldErrors };

export function readForm(formData: FormData): StockFormValues {
  const values: StockFormValues = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
  }
  return values;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_QTY = 1e11;

function decimals(value: number, places: number) {
  return Math.round(value * 10 ** places) / 10 ** places === value;
}

function quantity(raw: string | undefined, { allowZero = false } = {}): number | string {
  if (!raw) return "Enter a quantity.";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "Enter a number.";
  if (n < 0 || (n === 0 && !allowZero)) return allowZero ? "Cannot be negative." : "Must be greater than zero.";
  if (!decimals(n, 3)) return "Use at most 3 decimal places.";
  if (n >= MAX_QTY) return "That quantity is too large.";
  return n;
}

function optionalMoney(raw: string | undefined, places: number): number | null | string {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return "Enter 0 or a positive amount.";
  if (!decimals(n, places)) return `Use at most ${places} decimal places.`;
  if (n >= 1e10) return "That amount is too large.";
  return n;
}

function optionalDate(raw: string | undefined): string | null | false {
  if (!raw) return null;
  if (!DATE_RE.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? false : raw;
}

/** The browser converts the local date/time picker to a UTC ISO string. */
function occurredAt(raw: string | undefined): string | null | false {
  if (!raw) return null; // empty = "now"
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString();
}

function textMax(raw: string | undefined, max: number): string | null {
  return raw ? raw.slice(0, max + 1) : null;
}

function common(values: StockFormValues, errors: StockFieldErrors) {
  if (!isUuid(values.item_id)) errors.item_id = "Choose an item.";
  const unit = values.unit as StockUnit;
  if (!(STOCK_UNITS as readonly string[]).includes(unit)) errors.item_id = "Choose an item.";
  const when = occurredAt(values.occurred_at);
  if (when === false) errors.occurred_at = "Enter a valid date and time.";
  else if (when && new Date(when).getTime() > Date.now() + 5 * 60_000) errors.occurred_at = "Cannot be in the future.";
  const note = textMax(values.note, 1000);
  if (note && note.length > 1000) errors.note = "Note must be 1000 characters or fewer.";
  return { item_id: values.item_id, unit, occurred_at: when || null, note };
}

// ---------------------------------------------------------------- receive ---
export type ReceiveInput = ReturnType<typeof common> & {
  quantity: number;
  supplier_id: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  batch_number: string | null;
  expiration_date: string | null;
};

export function parseReceive(values: StockFormValues): Result<ReceiveInput> {
  const errors: StockFieldErrors = {};
  const base = common(values, errors);
  const qty = quantity(values.quantity);
  if (typeof qty === "string") errors.quantity = qty;

  if (values.supplier_id && !isUuid(values.supplier_id)) errors.supplier_id = "Choose a valid supplier.";

  const unitCost = optionalMoney(values.unit_cost, 4);
  const totalCost = optionalMoney(values.total_cost, 2);
  if (typeof unitCost === "string") errors.unit_cost = unitCost;
  if (typeof totalCost === "string") errors.total_cost = totalCost;
  if (typeof unitCost === "number" && typeof totalCost === "number")
    errors.total_cost = "Enter either a unit cost or a total cost, not both.";

  const batch = values.batch_number ?? "";
  if (batch.length > 80) errors.batch_number = "Batch reference must be 80 characters or fewer.";

  const expiry = optionalDate(values.expiration_date);
  if (expiry === false) errors.expiration_date = "Enter a valid date.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      ...base,
      quantity: qty as number,
      supplier_id: values.supplier_id || null,
      unit_cost: unitCost as number | null,
      total_cost: totalCost as number | null,
      batch_number: batch || null,
      expiration_date: expiry as string | null,
    },
  };
}

// ------------------------------------------------------------------ usage ---
export type UsageInput = ReturnType<typeof common> & { quantity: number; reason: string | null };

export function parseUsage(values: StockFormValues): Result<UsageInput> {
  const errors: StockFieldErrors = {};
  const base = common(values, errors);
  const qty = quantity(values.quantity);
  if (typeof qty === "string") errors.quantity = qty;
  if ((values.reason ?? "").length > 200) errors.reason = "Reason must be 200 characters or fewer.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { ...base, quantity: qty as number, reason: values.reason || null } };
}

// ---------------------------------------------------------------- wastage ---
export const WASTAGE_REASONS = [
  "Expired",
  "Spoiled",
  "Spilled",
  "Damaged packaging",
  "Incorrectly prepared",
  "Dropped or contaminated",
] as const;

export type WastageInput = ReturnType<typeof common> & { quantity: number; reason: string; batch_id: string | null };

export function parseWastage(values: StockFormValues): Result<WastageInput> {
  const errors: StockFieldErrors = {};
  const base = common(values, errors);
  const qty = quantity(values.quantity);
  if (typeof qty === "string") errors.quantity = qty;

  // "Other" lets the user type their own reason.
  const reason = values.reason === "Other" ? (values.reason_other ?? "") : (values.reason ?? "");
  if (!reason) errors[values.reason === "Other" ? "reason_other" : "reason"] = "A reason is required for wastage.";
  else if (reason.length > 200) errors.reason_other = "Reason must be 200 characters or fewer.";

  if (values.batch_id && !isUuid(values.batch_id)) errors.batch_id = "Choose a valid batch.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { ...base, quantity: qty as number, reason, batch_id: values.batch_id || null } };
}

// ------------------------------------------------------------- adjustment ---
export type AdjustInput = {
  item_id: string;
  unit: StockUnit;
  new_quantity: number;
  reason: string;
  note: string | null;
  expiration_date: string | null;
};

export function parseAdjust(values: StockFormValues): Result<AdjustInput> {
  const errors: StockFieldErrors = {};
  if (!isUuid(values.item_id)) errors.item_id = "Invalid item.";
  const unit = values.unit as StockUnit;
  if (!(STOCK_UNITS as readonly string[]).includes(unit)) errors.item_id = "Invalid item.";
  const qty = quantity(values.new_quantity, { allowZero: true });
  if (typeof qty === "string") errors.new_quantity = qty;
  const reason = values.reason ?? "";
  if (!reason) errors.reason = "A reason is required for adjustments.";
  else if (reason.length > 200) errors.reason = "Reason must be 200 characters or fewer.";
  if ((values.note ?? "").length > 1000) errors.note = "Note must be 1000 characters or fewer.";
  const expiry = optionalDate(values.expiration_date);
  if (expiry === false) errors.expiration_date = "Enter a valid date.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      item_id: values.item_id,
      unit,
      new_quantity: qty as number,
      reason,
      note: values.note || null,
      expiration_date: expiry as string | null,
    },
  };
}
