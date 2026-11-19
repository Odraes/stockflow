import { requirePermission } from "@/lib/auth";
import { csvFileName } from "@/lib/csv";
import { runReport } from "@/lib/data/reports";
import { parseReportQuery } from "@/lib/reports/query";
import { reportToCsv } from "@/lib/reports/to-csv";
import { todayInCafe } from "@/lib/timezone";

/**
 * GET /reports/export?report=...  →  CSV download.
 * A Route Handler (not a page) because it returns a file. It checks the same
 * permission as the reports page; the queries also run under RLS.
 */
export async function GET(request: Request) {
  await requirePermission("reports:view");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseReportQuery(params);
  const csv = reportToCsv(await runReport(query));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName(query.report, todayInCafe())}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
