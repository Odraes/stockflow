import { Badge } from "@/components/ui/badge";
import type { DashboardItem } from "@/lib/data/dashboard";
import { formatQuantity, STOCK_STATUS } from "@/lib/stock";

/** Low-stock and out-of-stock items, most urgent (out of stock) first. */
export function StockAlertList({ items }: { items: DashboardItem[] }) {
  return (
    <ul className="divide-y">
      {items.slice(0, 8).map((item) => {
        const status = STOCK_STATUS[item.status];
        return (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatQuantity(item.quantity, item.unit)} left · minimum {formatQuantity(item.minStock, item.unit)}
              </p>
            </div>
            <Badge variant={status.tone}>{status.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
