import Link from "next/link";
import { Suspense } from "react";
import { MovementList } from "@/components/dashboard/movement-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRecentOperations } from "@/lib/data/stock";
import type { MovementType } from "@/lib/stock";

/** Shared layout for the stock-in / usage / wastage pages: form + recent entries. */
export function StockPage({
  title,
  description,
  recentTitle,
  recentType,
  children,
}: {
  title: string;
  description: string;
  recentTitle: string;
  recentType: MovementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">{recentTitle}</CardTitle>
            <Link href={`/transactions?type=${recentType}`} className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-muted" />}>
              <Recent type={recentType} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function Recent({ type }: { type: MovementType }) {
  const movements = await listRecentOperations({ type, limit: 8 });
  if (movements.length === 0) {
    return <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }
  return <MovementList movements={movements} />;
}

export function FormSkeleton() {
  return <div className="h-96 animate-pulse rounded-md bg-muted" aria-busy="true" aria-label="Loading form" />;
}
