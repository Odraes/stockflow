import type { Database } from "@/types/database";

export type StockUnit = Database["public"]["Enums"]["stock_unit"];
export type MovementType = Database["public"]["Enums"]["movement_type"];
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

type BadgeTone = "success" | "warning" | "danger" | "secondary" | "outline";

export const STOCK_STATUS: Record<StockStatus, { label: string; tone: BadgeTone }> = {
  in_stock: { label: "In stock", tone: "success" },
  low_stock: { label: "Low stock", tone: "warning" },
  out_of_stock: { label: "Out of stock", tone: "danger" },
};

export const MOVEMENT_TYPE: Record<MovementType, { label: string; tone: BadgeTone }> = {
  receive: { label: "Received", tone: "success" },
  usage: { label: "Used", tone: "secondary" },
  wastage: { label: "Wasted", tone: "danger" },
  adjustment: { label: "Adjusted", tone: "outline" },
};

export function isStockStatus(value: unknown): value is StockStatus {
  return value === "in_stock" || value === "low_stock" || value === "out_of_stock";
}

const quantityFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 });

/** 1500 + "ml" → "1,500 ml". Quantities are always shown in the item's base unit. */
export function formatQuantity(quantity: number, unit: StockUnit): string {
  return `${quantityFormat.format(quantity)} ${unit}`;
}

/** Signed version for movements: "+500 ml" / "−250 g". */
export function formatQuantityChange(change: number, unit: StockUnit): string {
  const sign = change > 0 ? "+" : "−";
  return `${sign}${formatQuantity(Math.abs(change), unit)}`;
}

/** Must match the SQL function public.near_expiry_days(). */
export const NEAR_EXPIRY_DAYS = 3;
