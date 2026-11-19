import { Badge } from "@/components/ui/badge";
import { STOCK_STATUS, type StockStatus } from "@/lib/stock";

/** Stock status plus expiry badges, shared by the table and the detail page. */
export function ItemStatusBadges({
  status,
  expiredQuantity,
  expiringQuantity,
  archived,
}: {
  status: StockStatus;
  expiredQuantity: number;
  expiringQuantity: number;
  archived?: boolean;
}) {
  const s = STOCK_STATUS[status];
  return (
    <div className="flex flex-wrap gap-1">
      {archived && <Badge variant="outline">Archived</Badge>}
      <Badge variant={s.tone}>{s.label}</Badge>
      {expiredQuantity > 0 && <Badge variant="danger">Expired</Badge>}
      {expiringQuantity > 0 && <Badge variant="warning">Near expiration</Badge>}
    </div>
  );
}
