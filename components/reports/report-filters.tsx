import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { REPORTS, type ReportQuery } from "@/lib/reports/query";

const STATUS = [
  ["all", "All statuses"],
  ["in_stock", "In stock"],
  ["low_stock", "Low stock"],
  ["out_of_stock", "Out of stock"],
] as const;

/** GET form: filters live in the URL so reports can be bookmarked and shared. */
export function ReportFilters({ query, categories }: { query: ReportQuery; categories: { id: string; name: string }[] }) {
  const filters: readonly string[] = REPORTS.find((r) => r.key === query.report)!.filters;
  return (
    <Form action="/reports" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="report" value={query.report} />
      {filters.includes("period") && (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">From</span>
            <Input type="date" name="from" defaultValue={query.from} required className="w-40" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">To</span>
            <Input type="date" name="to" defaultValue={query.to} required className="w-40" />
          </label>
        </>
      )}
      {filters.includes("days") && (
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Expiring within</span>
          <NativeSelect name="days" defaultValue={String(query.days)} className="w-36">
            {[0, 3, 7, 14, 30, 60].map((d) => (
              <option key={d} value={d}>{d === 0 ? "Expired or due today" : `${d} days`}</option>
            ))}
          </NativeSelect>
        </label>
      )}
      {filters.includes("category") && (
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Category</span>
          <NativeSelect name="category" defaultValue={query.category ?? ""} className="w-48">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </label>
      )}
      {filters.includes("status") && (
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <NativeSelect name="status" defaultValue={query.status} className="w-40">
            {STATUS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NativeSelect>
        </label>
      )}
      <Button type="submit">Apply</Button>
    </Form>
  );
}
