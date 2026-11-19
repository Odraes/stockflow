import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ItemStatusBadges } from "@/components/inventory/item-status-badges";
import type { InventoryRow } from "@/lib/data/inventory";
import { formatQuantity } from "@/lib/stock";
import { inventoryHref, type InventoryQuery, type SortField } from "@/lib/validations/inventory-query";
import { cn } from "@/lib/utils";

function SortHeader({ query, field, label, className }: { query: InventoryQuery; field: SortField; label: string; className?: string }) {
  const active = query.sort === field;
  const nextDir = active && query.dir === "asc" ? "desc" : "asc";
  const Icon = !active ? ArrowUpDown : query.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={cn("px-3 py-2 font-medium", className)} aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={inventoryHref(query, { sort: field, dir: nextDir, page: 1 })} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} aria-hidden />
      </Link>
    </th>
  );
}

export function InventoryTable({ rows, query }: { rows: InventoryRow[]; query: InventoryQuery }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-muted-foreground">
          <tr>
            <SortHeader query={query} field="name" label="Item" />
            <SortHeader query={query} field="sku" label="SKU" className="hidden sm:table-cell" />
            <SortHeader query={query} field="category_name" label="Category" className="hidden md:table-cell" />
            <SortHeader query={query} field="quantity" label="Quantity" className="text-right" />
            <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">Minimum</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="hidden px-3 py-2 font-medium xl:table-cell">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/40">
              <td className="px-3 py-2.5">
                <Link href={`/inventory/${row.id}`} className="font-medium hover:underline">
                  {row.name}
                </Link>
                <p className="text-xs text-muted-foreground sm:hidden">{row.sku}</p>
              </td>
              <td className="hidden px-3 py-2.5 font-mono text-xs sm:table-cell">{row.sku}</td>
              <td className="hidden px-3 py-2.5 md:table-cell">{row.categoryName}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatQuantity(row.quantity, row.unit)}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground lg:table-cell">
                {formatQuantity(row.minStock, row.unit)}
              </td>
              <td className="px-3 py-2.5">
                <ItemStatusBadges
                  status={row.status}
                  expiredQuantity={row.expiredQuantity}
                  expiringQuantity={row.expiringQuantity}
                />
              </td>
              <td className="hidden px-3 py-2.5 text-muted-foreground xl:table-cell">{row.location ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
