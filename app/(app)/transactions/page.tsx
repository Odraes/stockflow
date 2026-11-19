import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { requirePermission } from "@/lib/auth";
import { listMovements, listStockItemOptions, MOVEMENTS_PAGE_SIZE } from "@/lib/data/stock";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatQuantity, formatQuantityChange, MOVEMENT_TYPE } from "@/lib/stock";
import { movementsHref, parseMovementQuery } from "@/lib/validations/movement-query";

export const metadata: Metadata = { title: "Transactions" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("transactions:view");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Every stock movement, newest first. This history is permanent: mistakes are corrected with a new adjustment, never by editing.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const query = parseMovementQuery(await searchParams);
  const [{ rows, total }, items] = await Promise.all([listMovements(query), listStockItemOptions({ includeArchived: true })]);
  const pages = Math.max(1, Math.ceil(total / MOVEMENTS_PAGE_SIZE));
  const filtered = Boolean(query.type || query.itemId || query.from || query.to);

  return (
    <div className="space-y-4">
      <Form action="/transactions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_auto] lg:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Type</span>
          <NativeSelect name="type" defaultValue={query.type ?? ""}>
            <option value="">All types</option>
            {Object.entries(MOVEMENT_TYPE).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Item</span>
          <NativeSelect name="item" defaultValue={query.itemId ?? ""}>
            <option value="">All items</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <Input type="date" name="from" defaultValue={query.from ?? ""} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <Input type="date" name="to" defaultValue={query.to ?? ""} />
        </label>
        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/transactions">Clear</Link>
            </Button>
          )}
        </div>
      </Form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-medium">
            {total > 0 ? "This page is past the end of the results" : filtered ? "No transactions match these filters" : "No transactions yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? (
              <Link href={movementsHref(query, { page: 1 })} className="underline underline-offset-4">Go to the first page</Link>
            ) : filtered ? "Try a wider date range or clear the filters." : "Deliveries, usage, wastage and adjustments will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Change</th>
                  <th className="hidden px-3 py-2 text-right font-medium md:table-cell">Before → after</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Batch / supplier</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Reason / note</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((m) => {
                  const type = MOVEMENT_TYPE[m.type];
                  // Backdated entries also show when they were actually recorded.
                  const backdated = Math.abs(new Date(m.createdAt).getTime() - new Date(m.occurredAt).getTime()) > 60 * 60 * 1000;
                  return (
                    <tr key={m.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {formatDateTime(m.occurredAt)}
                        {backdated && <p className="text-xs text-muted-foreground">recorded {formatDateTime(m.createdAt)}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.itemId ? <Link href={`/inventory/${m.itemId}`} className="font-medium hover:underline">{m.itemName}</Link> : m.itemName}
                        <p className="font-mono text-xs text-muted-foreground">{m.itemSku}</p>
                      </td>
                      <td className="px-3 py-2.5"><Badge variant={type.tone}>{type.label}</Badge></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">{formatQuantityChange(m.quantityChange, m.unit)}</td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground md:table-cell">
                        {formatQuantity(m.previousQuantity, m.unit)} → {formatQuantity(m.resultingQuantity, m.unit)}
                      </td>
                      <td className="hidden px-3 py-2.5 text-muted-foreground lg:table-cell">
                        {m.batchNumber ?? (m.batchExpiry ? "" : "—")}
                        {m.batchExpiry && <span className="block text-xs">exp. {formatDate(m.batchExpiry)}</span>}
                        {m.supplierName && <span className="block text-xs">{m.supplierName}</span>}
                      </td>
                      <td className="hidden max-w-xs px-3 py-2.5 text-muted-foreground xl:table-cell">
                        {[m.reason, m.note].filter(Boolean).join(" — ") || "—"}
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">{m.userName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              {total} movement{total === 1 ? "" : "s"} · page {Math.min(query.page, pages)} of {pages}
            </p>
            <div className="flex gap-2">
              {query.page > 1 ? (
                <Button asChild variant="outline" size="sm"><Link href={movementsHref(query, { page: query.page - 1 })}>Previous</Link></Button>
              ) : (
                <Button variant="outline" size="sm" disabled>Previous</Button>
              )}
              {query.page < pages ? (
                <Button asChild variant="outline" size="sm"><Link href={movementsHref(query, { page: query.page + 1 })}>Next</Link></Button>
              ) : (
                <Button variant="outline" size="sm" disabled>Next</Button>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
