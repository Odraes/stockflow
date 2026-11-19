import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card, CardContent } from "@/components/ui/card";
import { updateSupplier } from "@/app/(app)/suppliers/actions";
import { requirePermission } from "@/lib/auth";
import { getSupplier } from "@/lib/data/suppliers";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("suppliers:manage");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const s = await getSupplier(id);
  if (!s) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit {s.name}</h1>
      <Card>
        <CardContent className="pt-6">
          <SupplierForm
            action={updateSupplier.bind(null, id)}
            initialValues={{
              name: s.name,
              contact_person: s.contact_person ?? "",
              phone: s.phone ?? "",
              email: s.email ?? "",
              address: s.address ?? "",
              notes: s.notes ?? "",
            }}
            submitLabel="Save changes"
            cancelHref={`/suppliers/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
