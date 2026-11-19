import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportTable } from "@/components/reports/report-table";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { listCategoryOptions } from "@/lib/data/inventory";
import { runReport } from "@/lib/data/reports";
import { formatDate } from "@/lib/format";
import { parseReportQuery, REPORTS, reportSearch } from "@/lib/reports/query";
import { CAFE_TIME_ZONE } from "@/lib/timezone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reports:view");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Inventory, expiry, usage, wastage and purchasing. Every report can be downloaded as CSV for Excel or Google Sheets.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <ReportView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReportView({ searchParams }: { searchParams: SearchParams }) {
  const query = parseReportQuery(await searchParams);
  const def = REPORTS.find((r) => r.key === query.report)!;
  const [report, categories] = await Promise.all([runReport(query), listCategoryOptions()]);
  const isPeriod = (def.filters as readonly string[]).includes("period");

  return (
    <div className="space-y-5">
      <nav aria-label="Reports" className="flex gap-1 overflow-x-auto border-b text-sm">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/reports?${reportSearch(query, { report: r.key })}`}
            aria-current={r.key === query.report ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2",
              r.key === query.report ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-semibold">{def.label}</h2>
          <p className="text-sm text-muted-foreground">{def.description}</p>
          {isPeriod && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(query.from)} – {formatDate(query.to)} · days in {CAFE_TIME_ZONE}
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          {/* A plain link: the browser downloads the file the route returns. */}
          <a href={`/reports/export?${reportSearch(query)}`} download>
            <Download className="h-4 w-4" /> Download CSV
          </a>
        </Button>
      </div>

      <ReportFilters query={query} categories={categories} />

      {report.rows.length > 0 && (
        <p className="text-sm text-muted-foreground">{report.summary.join(" · ")}</p>
      )}

      {report.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">{report.empty}</div>
      ) : (
        <ReportTable report={report} />
      )}
    </div>
  );
}
