import type { Metadata } from "next";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card, CardContent } from "@/components/ui/card";
import { createSupplier } from "@/app/(app)/suppliers/actions";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Add supplier" };

const EMPTY = { name: "", contact_person: "", phone: "", email: "", address: "", notes: "" };

export default async function NewSupplierPage() {
  await requirePermission("suppliers:manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add supplier</h1>
      <Card>
        <CardContent className="pt-6">
          <SupplierForm action={createSupplier} initialValues={EMPTY} submitLabel="Create supplier" cancelHref="/suppliers" />
        </CardContent>
      </Card>
    </div>
  );
}
