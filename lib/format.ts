import { CAFE_TIME_ZONE } from "@/lib/timezone";

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: CAFE_TIME_ZONE,
});

/** "19 Nov 2026, 13:10" in the café's time zone (see lib/timezone.ts). */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(typeof value === "string" ? new Date(value) : value);
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

/** For DATE columns ("2026-11-21" → "21 Nov 2026"). UTC so the day never shifts. */
export function formatDate(value: string): string {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}

const moneyFormat = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Costs without a currency symbol until the café currency is configurable. */
export function formatMoney(value: number): string {
  return moneyFormat.format(value);
}

const unitCostFormat = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** Unit costs are per base unit (per ml, g or piece), so they need more decimals: 0.0012. */
export function formatUnitCost(value: number): string {
  return unitCostFormat.format(value);
}
