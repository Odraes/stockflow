import { Constants } from "@/types/database";
import type { MovementQuery } from "@/lib/data/stock";
import type { MovementType } from "@/lib/stock";
import { isUuid } from "@/lib/validations/common";

/** URL → safe transactions query (unknown values fall back to defaults). */

const TYPES = Constants.public.Enums.movement_type as readonly string[];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function date(value: string): string | null {
  if (!DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value) ? value : null;
}

export function parseMovementQuery(params: Raw): MovementQuery {
  const type = first(params.type);
  const item = first(params.item);
  const page = Number.parseInt(first(params.page), 10);
  let from = date(first(params.from));
  let to = date(first(params.to));
  if (from && to && from > to) [from, to] = [to, from]; // forgive swapped dates
  return {
    type: TYPES.includes(type) ? (type as MovementType) : null,
    itemId: isUuid(item) ? item : null,
    from,
    to,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

export function movementsHref(q: MovementQuery, overrides: Partial<MovementQuery> = {}): string {
  const m = { ...q, ...overrides };
  const params = new URLSearchParams();
  if (m.type) params.set("type", m.type);
  if (m.itemId) params.set("item", m.itemId);
  if (m.from) params.set("from", m.from);
  if (m.to) params.set("to", m.to);
  if (m.page > 1) params.set("page", String(m.page));
  const qs = params.toString();
  return qs ? `/transactions?${qs}` : "/transactions";
}
