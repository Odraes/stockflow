import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ReportColumn, ReportResult, ReportRow, Tone } from "@/lib/data/reports";
import { formatDate, formatDateTime, formatMoney, formatUnitCost } from "@/lib/format";
import { formatQuantity, type StockUnit } from "@/lib/stock";
import { cn } from "@/lib/utils";

const HIDE: Record<NonNullable<ReportColumn["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};
const NUMERIC = new Set(["integer", "quantity", "money", "unitCost"]);

function renderCell(column: ReportColumn, row: ReportRow) {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  switch (column.kind) {
    case "quantity":
      return formatQuantity(Number(value), (row[column.unitKey ?? "unit"] ?? "pcs") as StockUnit);
    case "money":
      return formatMoney(Number(value));
    case "unitCost":
      return formatUnitCost(Number(value));
    case "integer":
      return Number(value).toLocaleString("en-GB");
    case "date":
      return formatDate(String(value));
    case "datetime":
      return formatDateTime(String(value));
    case "badge":
      return <Badge variant={(row[column.toneKey ?? "tone"] ?? "secondary") as Tone}>{String(value)}</Badge>;
    case "mono":
      return <span className="font-mono text-xs">{String(value)}</span>;
    default:
      return String(value);
  }
}

/** Renders any report. Columns marked csvOnly appear only in the export. */
export function ReportTable({ report }: { report: ReportResult }) {
  const columns = report.columns.filter((c) => !c.csvOnly);
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2 font-medium", NUMERIC.has(c.kind) && "text-right", c.hideBelow && HIDE[c.hideBelow])}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {report.rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/40">
              {columns.map((c) => {
                const href = c.href?.(row);
                const content = renderCell(c, row);
                return (
                  <td key={c.key} className={cn("px-3 py-2.5", NUMERIC.has(c.kind) && "text-right tabular-nums", c.hideBelow && HIDE[c.hideBelow])}>
                    {href ? <Link href={href} className="font-medium hover:underline">{content}</Link> : content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
