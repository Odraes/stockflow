import { Constants } from "@/types/database";
import type { StockUnit } from "@/lib/stock";
import { isUuid } from "@/lib/validations/common";

/**
 * Server-side validation for the item form. The rules mirror the database
 * constraints (see the schema migration) so users get a clear message per
 * field instead of a raw database error. The database still enforces them.
 */

export const STOCK_UNITS = Constants.public.Enums.stock_unit;

export const UNIT_LABELS: Record<StockUnit, string> = {
  g: "Grams (g)",
  ml: "Millilitres (ml)",
  pcs: "Pieces (pcs)",
};

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,63}$/;

export type ItemInput = {
  name: string;
  sku: string;
  description: string | null;
  category_id: string;
  supplier_id: string | null;
  unit: StockUnit;
  min_stock: number;
  location: string | null;
};

export type ItemField = keyof ItemInput;
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/** Raw text the user typed, sent back so the form can be re-filled after an error. */
export type ItemFormValues = Record<ItemField, string>;

export type ParseResult<T, F extends string> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors<F> };

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export function readItemForm(formData: FormData): ItemFormValues {
  return {
    name: text(formData, "name"),
    sku: text(formData, "sku"),
    description: text(formData, "description"),
    category_id: text(formData, "category_id"),
    supplier_id: text(formData, "supplier_id"),
    unit: text(formData, "unit"),
    min_stock: text(formData, "min_stock"),
    location: text(formData, "location"),
  };
}

export function parseItem(values: ItemFormValues): ParseResult<ItemInput, ItemField> {
  const errors: FieldErrors<ItemField> = {};

  if (!values.name) errors.name = "Name is required.";
  else if (values.name.length > 120) errors.name = "Name must be 120 characters or fewer.";

  const sku = values.sku.toUpperCase();
  if (!sku) errors.sku = "SKU is required.";
  else if (!SKU_PATTERN.test(sku))
    errors.sku = "Use letters, numbers, dots, dashes or underscores (max 64), starting with a letter or number.";

  if (values.description.length > 1000) errors.description = "Description must be 1000 characters or fewer.";

  if (!isUuid(values.category_id)) errors.category_id = "Choose a category.";
  if (values.supplier_id && !isUuid(values.supplier_id)) errors.supplier_id = "Choose a valid supplier.";

  const unit = values.unit as StockUnit;
  if (!(STOCK_UNITS as readonly string[]).includes(unit)) errors.unit = "Choose a unit.";

  const minStock = values.min_stock === "" ? 0 : Number(values.min_stock);
  if (!Number.isFinite(minStock) || minStock < 0) errors.min_stock = "Minimum stock must be 0 or more.";
  else if (Math.round(minStock * 1000) / 1000 !== minStock) errors.min_stock = "Use at most 3 decimal places.";
  else if (minStock >= 1e11) errors.min_stock = "Minimum stock is too large.";

  if (values.location.length > 120) errors.location = "Location must be 120 characters or fewer.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: values.name,
      sku,
      description: values.description || null,
      category_id: values.category_id,
      supplier_id: values.supplier_id || null,
      unit,
      min_stock: minStock,
      location: values.location || null,
    },
  };
}
