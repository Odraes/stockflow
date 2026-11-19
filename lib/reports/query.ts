import { todayInCafe } from "@/lib/timezone";
import { isUuid } from "@/lib/validations/common";

/** Report catalogue and URL → query parsing (unknown values fall back to defaults). */

export const REPORTS = [
  { key: "inventory", label: "Current inventory", description: "Every active item with its stock level and status.", filters: ["category", "status"] },
  { key: "low-stock", label: "Low & out of stock", description: "Items at or below their minimum, with how much is needed to get back to the minimum.", filters: ["category"] },
  { key: "expiring", label: "Expiring stock", description: "Batches that are expired or expire soon, oldest expiry first.", filters: ["category", "days"] },
  { key: "movements", label: "Stock movement summary", description: "Per item: received, used, wasted and adjusted in the period, plus purchase cost.", filters: ["period", "category"] },
  { key: "wastage", label: "Wastage by reason", description: "Why stock was thrown away in the period. Units are never mixed.", filters: ["period", "category"] },
  { key: "suppliers", label: "Supplier purchasing", description: "Deliveries and spending per supplier in the period.", filters: ["period"] },
] as const;

export type ReportKey = (typeof REPORTS)[number]["key"];
export type ReportFilter = (typeof REPORTS)[number]["filters"][number];
export type StatusFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

export type ReportQuery = {
  report: ReportKey;
  category: string | null;
  status: StatusFilter;
  days: number;
  from: string; // YYYY-MM-DD in the café time zone
  to: string;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): string | null {
  if (!DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value) ? value : null;
}

/** Add days to a YYYY-MM-DD string (calendar maths in UTC, so no DST surprises). */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseReportQuery(params: Raw): ReportQuery {
  const today = todayInCafe();
  const report = first(params.report);
  const status = first(params.status);
  const days = Number.parseInt(first(params.days), 10);
  let from = validDate(first(params.from)) ?? addDays(today, -29); // default: last 30 days
  let to = validDate(first(params.to)) ?? today;
  if (from > to) [from, to] = [to, from];

  return {
    report: (REPORTS.find((r) => r.key === report)?.key ?? "inventory") as ReportKey,
    category: isUuid(first(params.category)) ? first(params.category) : null,
    status: (["in_stock", "low_stock", "out_of_stock"].includes(status) ? status : "all") as StatusFilter,
    days: Number.isFinite(days) ? Math.min(Math.max(days, 0), 365) : 7,
    from,
    to,
  };
}

/** Query string for a report (used by tabs, the filter form and CSV links). */
export function reportSearch(q: ReportQuery, overrides: Partial<ReportQuery> = {}): string {
  const m = { ...q, ...overrides };
  const def = REPORTS.find((r) => r.key === m.report)!;
  const filters: readonly string[] = def.filters;
  const params = new URLSearchParams({ report: m.report });
  if (filters.includes("category") && m.category) params.set("category", m.category);
  if (filters.includes("status") && m.status !== "all") params.set("status", m.status);
  if (filters.includes("days")) params.set("days", String(m.days));
  if (filters.includes("period")) {
    params.set("from", m.from);
    params.set("to", m.to);
  }
  return params.toString();
}
