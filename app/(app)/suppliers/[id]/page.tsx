import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CheckCircle2, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import { ArchiveButton } from "@/components/shared/archive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setSupplierArchived } from "@/app/(app)/suppliers/actions";
import { requirePermission } from "@/lib/auth";
import { getSupplier, getSupplierItems, getSupplierPurchases } from "@/lib/data/suppliers";
import { formatDate, formatDateTime, formatMoney, formatUnitCost } from "@/lib/format";
import { can } from "@/lib/permissions";
import { formatQuantity } from "@/lib/stock";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Supplier" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SupplierPage({ params, searchParams }: Props) {
  const user = await requirePermission("suppliers:view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const canManage = can(user.role, "suppliers:manage");
  const saved = sp.saved === "created" ? "Supplier created." : sp.saved === "updated" ? "Changes saved." : null;

  const contact = [
    { icon: User, value: supplier.contact_person },
    { icon: Phone, value: supplier.phone, href: supplier.phone ? `tel:${supplier.phone.replace(/[^0-9+]/g, "")}` : undefined },
    { icon: Mail, value: supplier.email, href: supplier.email ? `mailto:${supplier.email}` : undefined },
    { icon: MapPin, value: supplier.address },
  ].filter((c) => c.value);

  return (
    <div className="space-y-6">
      <Link href="/suppliers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Suppliers
      </Link>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {saved}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {!supplier.is_active && <Badge variant="outline">Archived</Badge>}
            <span>Added {formatDateTime(supplier.created_at)}</span>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-start gap-2">
            <Button asChild variant="outline">
              <Link href={`/suppliers/${id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <ArchiveButton
              action={setSupplierArchived.bind(null, id)}
              name={supplier.name}
              archived={!supplier.is_active}
              archiveHint="It can no longer be chosen for new deliveries. Past purchases and item links are kept."
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contact.length === 0 ? (
              <p className="text-muted-foreground">No contact details yet.</p>
            ) : (
              contact.map(({ icon: Icon, value, href }) => (
                <p key={String(value)} className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {href ? (
                    <a href={href} className="break-all underline-offset-4 hover:underline">{value}</a>
                  ) : (
                    <span className="whitespace-pre-line">{value}</span>
                  )}
                </p>
              ))
            )}
            {supplier.notes && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="whitespace-pre-line">{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Items supplied</CardTitle>
            <CardDescription>Items with this company as their preferred supplier.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-20 animate-pulse rounded-md bg-muted" />}>
              <SupplierItems supplierId={id} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Purchase history</CardTitle>
          <CardDescription>Every delivery received from this supplier, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-muted" />}>
            <PurchaseHistory supplierId={id} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function SupplierItems({ supplierId }: { supplierId: string }) {
  const items = await getSupplierItems(supplierId);
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No items use this supplier yet. Choose it as “Preferred supplier” when editing an item.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <Link href={`/inventory/${item.id}`} className="font-medium hover:underline">
            {item.name}
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{item.sku}</span>
          </Link>
          <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
            {!item.is_active && <Badge variant="outline">Archived</Badge>}
            {formatQuantity(item.quantity, item.unit)}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function PurchaseHistory({ supplierId }: { supplierId: string }) {
  const { purchases, total } = await getSupplierPurchases(supplierId);
  if (purchases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No deliveries recorded yet. Stock received from this supplier (Stock In) will be listed here.
      </p>
    );
  }

  const costed = purchases.filter((p) => p.totalCost !== null);
  const spent = costed.reduce((sum, p) => sum + (p.totalCost ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {total} deliver{total === 1 ? "y" : "ies"}
        {total > purchases.length ? ` (latest ${purchases.length} shown)` : ""}
        {costed.length > 0 && ` · ${formatMoney(spent)} total cost of those with a price`}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Received</th>
              <th className="py-2 pr-4 font-medium">Item</th>
              <th className="py-2 pr-4 text-right font-medium">Quantity</th>
              <th className="hidden py-2 pr-4 text-right font-medium sm:table-cell">Unit cost</th>
              <th className="py-2 pr-4 text-right font-medium">Total</th>
              <th className="hidden py-2 pr-4 font-medium md:table-cell">Batch</th>
              <th className="hidden py-2 font-medium md:table-cell">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchases.map((p) => (
              <tr key={p.batchId}>
                <td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">{formatDateTime(p.receivedAt)}</td>
                <td className="py-2 pr-4">
                  {p.itemId ? <Link href={`/inventory/${p.itemId}`} className="hover:underline">{p.itemName}</Link> : p.itemName}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatQuantity(p.quantity, p.unit)}</td>
                <td className="hidden py-2 pr-4 text-right tabular-nums sm:table-cell">
                  {p.unitCost === null ? "—" : `${formatUnitCost(p.unitCost)} / ${p.unit}`}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{p.totalCost === null ? "—" : formatMoney(p.totalCost)}</td>
                <td className="hidden py-2 pr-4 font-mono text-xs md:table-cell">{p.batchNumber ?? "—"}</td>
                <td className="hidden py-2 md:table-cell">{p.expirationDate ? formatDate(p.expirationDate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
