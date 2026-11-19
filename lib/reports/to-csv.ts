import { toCsv, type CsvCell } from "@/lib/csv";
import type { ReportResult } from "@/lib/data/reports";
import { formatDateTimeSortable } from "@/lib/format";

/** Report → CSV text. Numbers stay numbers (so spreadsheets can sum them). */
export function reportToCsv(report: ReportResult): string {
  const header = report.columns.map((c) => c.label);
  const rows = report.rows.map((row) =>
    report.columns.map((c): CsvCell => {
      const value = row[c.key];
      if (value === null || value === undefined) return null;
      if (c.kind === "datetime" && typeof value === "string") return formatDateTimeSortable(value);
      return value;
    }),
  );
  return toCsv(header, rows);
}
