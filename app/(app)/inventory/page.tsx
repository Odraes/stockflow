import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Pagination } from "@/components/inventory/pagination";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { listCategoryOptions, listInventory } from "@/lib/data/inventory";
import { can } from "@/lib/permissions";
import { inventoryHref, parseInventoryQuery } from "@/lib/validations/inventory-query";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("inventory:view");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Ingredients, packaging and supplies, in each item&apos;s base unit.</p>
        </div>
        {can(user.role, "inventory:manage") && (
          <Button asChild>
            <Link href="/inventory/new">
              <Plus className="h-4 w-4" /> Add item
            </Link>
          </Button>
        )}
      </div>

      {/* searchParams are request data, so the results stream in behind Suspense. */}
      <Suspense fallback={<ResultsSkeleton />}>
        <InventoryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InventoryResults({ searchParams }: { searchParams: SearchParams }) {
  const query = parseInventoryQuery(await searchParams);
  const [{ rows, total }, categories] = await Promise.all([listInventory(query), listCategoryOptions()]);
  const filtered = Boolean(query.q || query.category || query.status !== "all");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b text-sm">
        {[
          { label: "Active", archived: false },
          { label: "Archived", archived: true },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={inventoryHref(query, { archived: tab.archived, page: 1 })}
            aria-current={query.archived === tab.archived ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2",
              query.archived === tab.archived
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <InventoryFilters query={query} categories={categories} />

      {rows.length === 0 && total > 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-medium">This page is past the end of the results</p>
          <Link href={inventoryHref(query, { page: 1 })} className="mt-2 inline-block text-sm underline underline-offset-4">
            Go to the first page
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-medium">
            {filtered ? "No items match these filters" : query.archived ? "No archived items" : "No inventory items yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Try a different search or clear the filters."
              : query.archived
                ? "Archived items will appear here."
                : "Add your first ingredient or supply to get started."}
          </p>
        </div>
      ) : (
        <>
          <InventoryTable rows={rows} query={query} />
          <Pagination query={query} total={total} />
        </>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading inventory">
      <div className="h-9 animate-pulse rounded-md bg-muted" />
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
