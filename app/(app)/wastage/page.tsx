import type { Metadata } from "next";
import { Suspense } from "react";
import { WastageForm } from "@/components/stock/wastage-form";
import { FormSkeleton, StockPage } from "@/components/stock/stock-page";
import { requirePermission } from "@/lib/auth";
import { listOpenBatches, listStockItemOptions } from "@/lib/data/stock";
import { todayInCafe } from "@/lib/timezone";
import { isUuid } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Wastage" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WastagePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("stock:waste");
  return (
    <StockPage
      title="Wastage"
      description="Report expired, spoiled, spilled or damaged stock. Wastage is tracked separately from normal usage."
      recentTitle="Recent wastage"
      recentType="wastage"
    >
      <Suspense fallback={<FormSkeleton />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </StockPage>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  // Archived items that still hold stock can be written off too.
  const [sp, items, batches] = await Promise.all([
    searchParams,
    listStockItemOptions({ includeArchived: true }),
    listOpenBatches(),
  ]);
  const item = typeof sp.item === "string" && isUuid(sp.item) ? sp.item : "";
  return <WastageForm items={items} batches={batches} today={todayInCafe()} initialItemId={item} />;
}
