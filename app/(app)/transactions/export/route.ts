import { requirePermission } from "@/lib/auth";
import { csvFileName, toCsv } from "@/lib/csv";
import { listAllMovements } from "@/lib/data/stock";
import { formatDateTimeSortable } from "@/lib/format";
import { MOVEMENT_TYPE } from "@/lib/stock";
import { todayInCafe } from "@/lib/timezone";
import { parseMovementQuery } from "@/lib/validations/movement-query";

/** GET /transactions/export?type=&item=&from=&to=  →  the filtered audit log as CSV. */
export async function GET(request: Request) {
  await requirePermission("transactions:view");
  const query = parseMovementQuery(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await listAllMovements(query);

  const csv = toCsv(
    [
      "Occurred at", "Recorded at", "Item", "SKU", "Type", "Quantity change", "Unit",
      "Before", "After", "Batch", "Batch expiry", "Supplier", "Reason", "Note", "By", "Operation ID",
    ],
    rows.map((m) => [
      formatDateTimeSortable(m.occurredAt),
      formatDateTimeSortable(m.createdAt),
      m.itemName,
      m.itemSku,
      MOVEMENT_TYPE[m.type].label,
      m.quantityChange,
      m.unit,
      m.previousQuantity,
      m.resultingQuantity,
      m.batchNumber,
      m.batchExpiry,
      m.supplierName,
      m.reason,
      m.note,
      m.userName,
      m.operationId,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName("transactions", todayInCafe())}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
