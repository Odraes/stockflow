import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiveForm } from "@/components/stock/receive-form";
import { FormSkeleton, StockPage } from "@/components/stock/stock-page";
import { requirePermission } from "@/lib/auth";
import { listActiveSupplierOptions, listStockItemOptions } from "@/lib/data/stock";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Stock In" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StockInPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("stock:receive");
  return (
    <StockPage
      title="Stock In"
      description="Record a delivery. Each delivery becomes a batch with its own expiry date and cost."
      recentTitle="Recent deliveries"
      recentType="receive"
    >
      <Suspense fallback={<FormSkeleton />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </StockPage>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const [sp, items, suppliers] = await Promise.all([searchParams, listStockItemOptions(), listActiveSupplierOptions()]);
  const item = typeof sp.item === "string" && isUuid(sp.item) ? sp.item : "";
  return <ReceiveForm items={items} suppliers={suppliers} initialItemId={item} />;
}
