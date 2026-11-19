import { Badge } from "@/components/ui/badge";
import type { DashboardItem } from "@/lib/data/dashboard";
import { formatDate } from "@/lib/format";
import { formatQuantity } from "@/lib/stock";

/** Items with expired stock (shown first) or stock expiring soon. */
export function ExpiryList({ expired, expiring }: { expired: DashboardItem[]; expiring: DashboardItem[] }) {
  return (
    <ul className="divide-y">
      {expired.slice(0, 5).map((item) => (
        <li key={`expired-${item.id}`} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatQuantity(item.expiredQuantity, item.unit)} past its expiration date — record as wastage
            </p>
          </div>
          <Badge variant="danger">Expired</Badge>
        </li>
      ))}
      {expiring.slice(0, 5).map((item) => (
        <li key={`expiring-${item.id}`} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatQuantity(item.expiringQuantity, item.unit)}
              {item.nextExpirationDate ? ` expires ${formatDate(item.nextExpirationDate)}` : " expiring soon"}
            </p>
          </div>
          <Badge variant="warning">Near expiration</Badge>
        </li>
      ))}
    </ul>
  );
}
