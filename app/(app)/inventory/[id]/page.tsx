import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { ArchiveButton } from "@/components/inventory/archive-button";
import { ItemStatusBadges } from "@/components/inventory/item-status-badges";
import { MovementTable } from "@/components/inventory/movement-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { getItem, getItemBatches, getItemMovements, getItemStatus } from "@/lib/data/inventory";
import { formatDate, formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { formatQuantity, type StockUnit } from "@/lib/stock";
import { isUuid } from "@/lib/validations/common";
import { UNIT_LABELS } from "@/lib/validations/item";

export const metadata: Metadata = { title: "Item details" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemDetailPage({ params, searchParams }: Props) {
  const user = await requirePermission("inventory:view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const item = await getItem(id);
  if (!item) notFound();

  const [status, batches] = await Promise.all([getItemStatus(id), getItemBatches(id)]);
  const canManage = can(user.role, "inventory:manage");
  const saved = sp.saved === "created" ? "Item created." : sp.saved === "updated" ? "Changes saved." : null;

  const details: [string, React.ReactNode][] = [
    ["SKU", <span key="sku" className="font-mono">{item.sku}</span>],
    ["Category", item.category?.name ?? "—"],
    ["Preferred supplier", item.supplier?.name ?? "—"],
    ["Base unit", UNIT_LABELS[item.unit]],
    ["Minimum stock", formatQuantity(item.min_stock, item.unit)],
    ["Storage location", item.location ?? "—"],
    ["Created", `${formatDateTime(item.created_at)}${item.creator?.full_name ? ` by ${item.creator.full_name}` : ""}`],
    ["Last updated", formatDateTime(item.updated_at)],
  ];

  return (
    <div className="space-y-6">
      <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Inventory
      </Link>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {saved}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
          {status.status && (
            <ItemStatusBadges
              status={status.status}
              expiredQuantity={status.expiredQuantity}
              expiringQuantity={status.expiringQuantity}
              archived={!item.is_active}
            />
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap items-start gap-2">
            <Button asChild variant="outline">
              <Link href={`/inventory/${id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <ArchiveButton itemId={id} itemName={item.name} archived={!item.is_active} />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">In stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{formatQuantity(item.quantity, item.unit)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Minimum level: {formatQuantity(item.min_stock, item.unit)}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
            {item.description && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{item.description}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Batches in stock</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No stock on hand. Received stock will appear here as batches, used first-expired-first-out.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Batch</th>
                    <th className="py-2 pr-4 text-right font-medium">Remaining</th>
                    <th className="py-2 pr-4 font-medium">Expires</th>
                    <th className="hidden py-2 pr-4 font-medium md:table-cell">Received</th>
                    <th className="hidden py-2 font-medium md:table-cell">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2 pr-4 font-mono text-xs">{b.batch_number ?? "—"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatQuantity(b.remaining_quantity, item.unit)}
                        <span className="text-muted-foreground"> / {formatQuantity(b.received_quantity, item.unit)}</span>
                      </td>
                      <td className="py-2 pr-4">{b.expiration_date ? formatDate(b.expiration_date) : "No expiry"}</td>
                      <td className="hidden py-2 pr-4 text-muted-foreground md:table-cell">{formatDateTime(b.received_at)}</td>
                      <td className="hidden py-2 text-muted-foreground md:table-cell">{b.supplier?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent stock history</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-muted" />}>
            <ItemHistory itemId={id} unit={item.unit} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function ItemHistory({ itemId, unit }: { itemId: string; unit: StockUnit }) {
  const movements = await getItemMovements(itemId);
  if (movements.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No stock movements recorded for this item yet.
      </p>
    );
  }
  return <MovementTable movements={movements} unit={unit} />;
}

