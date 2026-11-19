import { isUuid } from "@/lib/validations/common";

/**
 * Turns the URL's search params (?q=milk&status=low_stock&page=2) into a
 * safe, fully-defined query. Anything unexpected falls back to a default, so
 * a hand-edited URL can never produce an invalid database request.
 */

export const STATUS_FILTERS = ["all", "in_stock", "low_stock", "out_of_stock", "near_expiry", "expired"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const SORT_FIELDS = ["name", "sku", "category_name", "quantity", "updated_at"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const PAGE_SIZE = 20;

export type InventoryQuery = {
  q: string;
  category: string | null;
  status: StatusFilter;
  sort: SortField;
  dir: "asc" | "desc";
  page: number;
  archived: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseInventoryQuery(params: RawParams): InventoryQuery {
  const status = first(params.status) as StatusFilter;
  const sort = first(params.sort) as SortField;
  const page = Number.parseInt(first(params.page), 10);
  const category = first(params.category);

  return {
    // PostgREST filter syntax uses , ( ) * % \ and quotes as operators. We
    // strip them from free text so the search can't alter the filter itself.
    q: first(params.q).replace(/[,()*%\\"':]/g, " ").trim().slice(0, 80),
    category: isUuid(category) ? category : null,
    status: STATUS_FILTERS.includes(status) ? status : "all",
    sort: SORT_FIELDS.includes(sort) ? sort : "name",
    dir: first(params.dir) === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
    archived: first(params.archived) === "1",
  };
}

/** Build a /inventory URL from a query, overriding some fields. Defaults are omitted. */
export function inventoryHref(query: InventoryQuery, overrides: Partial<InventoryQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.status !== "all") params.set("status", merged.status);
  if (merged.sort !== "name") params.set("sort", merged.sort);
  if (merged.dir !== "asc") params.set("dir", merged.dir);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.archived) params.set("archived", "1");
  const qs = params.toString();
  return qs ? `/inventory?${qs}` : "/inventory";
}
