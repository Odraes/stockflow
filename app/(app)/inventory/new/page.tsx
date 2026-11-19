import type { Metadata } from "next";
import { ItemForm } from "@/components/inventory/item-form";
import { Card, CardContent } from "@/components/ui/card";
import { createItem } from "@/app/(app)/inventory/actions";
import { requirePermission } from "@/lib/auth";
import { listCategoryOptions, listSupplierOptions } from "@/lib/data/inventory";

export const metadata: Metadata = { title: "Add item" };

const EMPTY = { name: "", sku: "", description: "", category_id: "", supplier_id: "", unit: "", min_stock: "0", location: "" };

export default async function NewItemPage() {
  await requirePermission("inventory:manage");
  const [categories, suppliers] = await Promise.all([listCategoryOptions(), listSupplierOptions()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add inventory item</h1>
        <p className="text-sm text-muted-foreground">
          New items start with 0 in stock. Stock is added later through Stock In, so every unit has an audit trail.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ItemForm
            action={createItem}
            initialValues={EMPTY}
            categories={categories}
            suppliers={suppliers}
            submitLabel="Create item"
            cancelHref="/inventory"
          />
        </CardContent>
      </Card>
    </div>
  );
}
