import { Badge } from "@/components/ui/badge";
import type { DashboardMovement } from "@/lib/data/dashboard";
import { formatDateTime } from "@/lib/format";
import { formatQuantityChange, MOVEMENT_TYPE } from "@/lib/stock";
import { cn } from "@/lib/utils";

/** Feed of recent stock movements (one line per operation). */
export function MovementList({ movements }: { movements: DashboardMovement[] }) {
  return (
    <ul className="divide-y">
      {movements.map((m) => {
        const type = MOVEMENT_TYPE[m.type];
        return (
          <li key={m.operationId} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={type.tone}>{type.label}</Badge>
                <p className="truncate text-sm font-medium">{m.itemName}</p>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {m.userName} · {formatDateTime(m.occurredAt)}
                {m.reason ? ` · ${m.reason}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-sm font-medium tabular-nums",
                m.quantityChange > 0 ? "text-success" : "text-foreground",
              )}
            >
              {formatQuantityChange(m.quantityChange, m.unit)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
