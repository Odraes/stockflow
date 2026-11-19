import type { Metadata } from "next";
import { Suspense } from "react";
import { UsageForm } from "@/components/stock/usage-form";
import { FormSkeleton, StockPage } from "@/components/stock/stock-page";
import { requirePermission } from "@/lib/auth";
import { listStockItemOptions } from "@/lib/data/stock";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Stock Usage" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StockUsagePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("stock:use");
  return (
    <StockPage
      title="Stock Usage"
      description="Record ingredients and supplies used during service. Stock is taken from the batch that expires first."
      recentTitle="Recent usage"
      recentType="usage"
    >
      <Suspense fallback={<FormSkeleton />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </StockPage>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const [sp, items] = await Promise.all([searchParams, listStockItemOptions()]);
  const item = typeof sp.item === "string" && isUuid(sp.item) ? sp.item : "";
  return <UsageForm items={items} initialItemId={item} />;
}
