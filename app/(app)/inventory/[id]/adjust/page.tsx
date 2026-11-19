import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdjustForm } from "@/components/stock/adjust-form";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { getItem } from "@/lib/data/inventory";
import { formatQuantity } from "@/lib/stock";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Adjust stock" };

export default async function AdjustPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("stock:adjust");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const item = await getItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/inventory/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {item.name}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Adjust stock: {item.name}</h1>
        <p className="text-sm text-muted-foreground">
          Recorded: <span className="font-medium text-foreground">{formatQuantity(item.quantity, item.unit)}</span>. Enter
          what you physically counted; the difference is recorded as an adjustment with your name and reason. History is never
          edited.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <AdjustForm itemId={id} unit={item.unit} currentQuantity={item.quantity} />
        </CardContent>
      </Card>
    </div>
  );
}
