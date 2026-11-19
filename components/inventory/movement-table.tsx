import { Badge } from "@/components/ui/badge";
import type { ItemMovement } from "@/lib/data/inventory";
import { formatDateTime } from "@/lib/format";
import { formatQuantity, formatQuantityChange, MOVEMENT_TYPE, type StockUnit } from "@/lib/stock";

/** Stock history for a single item (every row, not grouped). */
export function MovementTable({ movements, unit }: { movements: ItemMovement[]; unit: StockUnit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="py-2 pr-4 font-medium">When</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 text-right font-medium">Change</th>
            <th className="hidden py-2 pr-4 text-right font-medium sm:table-cell">Balance</th>
            <th className="hidden py-2 pr-4 font-medium md:table-cell">By</th>
            <th className="hidden py-2 font-medium lg:table-cell">Reason / note</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {movements.map((m) => {
            const type = MOVEMENT_TYPE[m.type];
            return (
              <tr key={m.id}>
                <td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">{formatDateTime(m.occurredAt)}</td>
                <td className="py-2 pr-4">
                  <Badge variant={type.tone}>{type.label}</Badge>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatQuantityChange(m.quantityChange, unit)}</td>
                <td className="hidden py-2 pr-4 text-right tabular-nums text-muted-foreground sm:table-cell">
                  {formatQuantity(m.resultingQuantity, unit)}
                </td>
                <td className="hidden py-2 pr-4 md:table-cell">{m.userName}</td>
                <td className="hidden py-2 text-muted-foreground lg:table-cell">
                  {[m.reason, m.note].filter(Boolean).join(" — ") || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
