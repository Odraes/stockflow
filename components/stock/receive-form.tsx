"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus, ItemPicker, OccurredAtField, QuantityInput } from "@/components/stock/fields";
import { receiveStockAction, type StockFormState } from "@/lib/actions/stock";
import type { StockItemOption } from "@/lib/data/stock";

type Props = {
  items: StockItemOption[];
  suppliers: { id: string; name: string }[];
  initialItemId?: string;
};

export function ReceiveForm({ items, suppliers, initialItemId = "" }: Props) {
  const [state, formAction, pending] = useActionState(receiveStockAction, {} as StockFormState);
  // Remount with the submitted values after an error; keep the item after success.
  return (
    <ReceiveFields
      key={JSON.stringify(state.values ?? state.itemId ?? null)}
      state={state}
      formAction={formAction}
      pending={pending}
      items={items}
      suppliers={suppliers}
      initialItemId={state.values?.item_id ?? state.itemId ?? initialItemId}
    />
  );
}

function ReceiveFields({
  state,
  formAction,
  pending,
  items,
  suppliers,
  initialItemId,
}: Props & { state: StockFormState; formAction: (fd: FormData) => void; pending: boolean; initialItemId: string }) {
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [itemId, setItemId] = useState(initialItemId);
  const item = items.find((i) => i.id === itemId);
  const preferred = (id: string) => {
    const s = items.find((i) => i.id === id)?.supplierId;
    return s && suppliers.some((x) => x.id === s) ? s : "";
  };
  const [supplierId, setSupplierId] = useState(v.supplier_id ?? preferred(initialItemId));

  // Choosing an item pre-selects its preferred supplier (still changeable).
  const chooseItem = (id: string) => {
    setItemId(id);
    setSupplierId(preferred(id));
  };

  return (
    <form action={formAction} className="space-y-6">
      <FormStatus state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <ItemPicker items={items} value={itemId} onChange={chooseItem} error={e.item_id} />
        </div>
        <QuantityInput id="quantity" label="Quantity received" unit={item?.unit} defaultValue={v.quantity} error={e.quantity} />
        <FormField id="supplier_id" label="Supplier" error={e.supplier_id} hint={suppliers.length === 0 ? "No active suppliers yet." : undefined}>
          <NativeSelect {...fieldAria("supplier_id", e.supplier_id)} value={supplierId} onChange={(ev) => setSupplierId(ev.target.value)}>
            <option value="">Not specified</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="unit_cost" label={`Cost per ${item?.unit ?? "unit"}`} error={e.unit_cost} hint="Optional. Or enter the total instead →">
          <Input {...fieldAria("unit_cost", e.unit_cost, "hint")} type="number" inputMode="decimal" min={0} step="0.0001" defaultValue={v.unit_cost} />
        </FormField>
        <FormField id="total_cost" label="Total cost" error={e.total_cost} hint="Optional. The unit cost is calculated for you.">
          <Input {...fieldAria("total_cost", e.total_cost, "hint")} type="number" inputMode="decimal" min={0} step="0.01" defaultValue={v.total_cost} />
        </FormField>
        <FormField id="batch_number" label="Batch / lot number" error={e.batch_number}>
          <Input {...fieldAria("batch_number", e.batch_number)} maxLength={80} defaultValue={v.batch_number} />
        </FormField>
        <FormField id="expiration_date" label="Expiration date" error={e.expiration_date} hint="Leave empty for non-perishables.">
          <Input {...fieldAria("expiration_date", e.expiration_date, "hint")} type="date" defaultValue={v.expiration_date} />
        </FormField>
        <OccurredAtField label="Received at" error={e.occurred_at} />
        <div className="md:col-span-2">
          <FormField id="note" label="Note" error={e.note}>
            <Textarea {...fieldAria("note", e.note)} rows={2} maxLength={1000} defaultValue={v.note} />
          </FormField>
        </div>
      </div>
      <Button type="submit" disabled={pending || items.length === 0}>
        {pending ? "Saving…" : "Record delivery"}
      </Button>
    </form>
  );
}
