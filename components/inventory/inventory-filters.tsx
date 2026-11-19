import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Option } from "@/lib/data/inventory";
import type { InventoryQuery, StatusFilter } from "@/lib/validations/inventory-query";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "near_expiry", label: "Near expiration" },
  { value: "expired", label: "Has expired stock" },
];

/**
 * A plain GET form: submitting it changes the URL (?q=...&status=...), and
 * the page re-renders on the server with those filters. next/form makes the
 * navigation client-side (no full reload) but it also works without JS.
 */
export function InventoryFilters({ query, categories }: { query: InventoryQuery; categories: Option[] }) {
  const hasFilters = query.q || query.category || query.status !== "all";

  return (
    <Form action="/inventory" className="flex flex-col gap-3 md:flex-row md:items-end">
      {/* keep sort + archived view when filtering; page resets to 1 */}
      {query.sort !== "name" && <input type="hidden" name="sort" value={query.sort} />}
      {query.dir !== "asc" && <input type="hidden" name="dir" value={query.dir} />}
      {query.archived && <input type="hidden" name="archived" value="1" />}

      <div className="relative flex-1">
        <label htmlFor="q" className="sr-only">
          Search by name or SKU
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id="q" name="q" type="search" defaultValue={query.q} placeholder="Search name or SKU…" className="pl-9" maxLength={80} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:flex">
        <label className="sr-only" htmlFor="category">
          Category
        </label>
        <NativeSelect id="category" name="category" defaultValue={query.category ?? ""} className="md:w-48">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>

        <label className="sr-only" htmlFor="status">
          Stock status
        </label>
        <NativeSelect id="status" name="status" defaultValue={query.status} className="md:w-44">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex gap-2">
        <Button type="submit">Apply</Button>
        {hasFilters && (
          <Button asChild variant="ghost">
            <Link href={query.archived ? "/inventory?archived=1" : "/inventory"}>Clear</Link>
          </Button>
        )}
      </div>
    </Form>
  );
}
