import Link from "next/link";
import { Button } from "@/components/ui/button";
import { inventoryHref, PAGE_SIZE, type InventoryQuery } from "@/lib/validations/inventory-query";

export function Pagination({ query, total }: { query: InventoryQuery; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (query.page - 1) * PAGE_SIZE + 1;
  const end = Math.min(query.page * PAGE_SIZE, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        {total === 0 ? "No items" : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        {query.page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={inventoryHref(query, { page: query.page - 1 })}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>Previous</Button>
        )}
        <span className="tabular-nums text-muted-foreground">
          Page {Math.min(query.page, pages)} of {pages}
        </span>
        {query.page < pages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={inventoryHref(query, { page: query.page + 1 })}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>Next</Button>
        )}
      </div>
    </nav>
  );
}
