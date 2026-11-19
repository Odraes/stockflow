import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/inventory/item-form";
import { Card, CardContent } from "@/components/ui/card";
import { updateItem } from "@/app/(app)/inventory/actions";
import { requirePermission } from "@/lib/auth";
import { getItem, itemHasHistory, listCategoryOptions, listSupplierOptions } from "@/lib/data/inventory";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("inventory:manage");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const item = await getItem(id);
  if (!item) notFound();

  const [categories, suppliers, hasHistory] = await Promise.all([
    listCategoryOptions(),
    listSupplierOptions(item.supplier_id),
    itemHasHistory(id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit {item.name}</h1>
        <p className="text-sm text-muted-foreground">
          Quantities can&apos;t be edited here — use Stock In, Usage, Wastage or an Adjustment so every change is recorded.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ItemForm
            action={updateItem.bind(null, id)}
            initialValues={{
              name: item.name,
              sku: item.sku,
              description: item.description ?? "",
              category_id: item.category_id,
              supplier_id: item.supplier_id ?? "",
              unit: item.unit,
              min_stock: String(item.min_stock),
              location: item.location ?? "",
            }}
            categories={categories}
            suppliers={suppliers}
            submitLabel="Save changes"
            cancelHref={`/inventory/${id}`}
            unitLocked={hasHistory}
          />
        </CardContent>
      </Card>
    </div>
  );
}
