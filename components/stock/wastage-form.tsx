"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus, ItemPicker, OccurredAtField, QuantityInput } from "@/components/stock/fields";
import { recordWastageAction, type StockFormState } from "@/lib/actions/stock";
import type { OpenBatch, StockItemOption } from "@/lib/data/stock";
import { formatQuantity } from "@/lib/stock";
import { WASTAGE_REASONS } from "@/lib/validations/stock";

type Props = { items: StockItemOption[]; batches: OpenBatch[]; today: string; initialItemId?: string };

export function WastageForm(props: Props) {
  const [state, formAction, pending] = useActionState(recordWastageAction, {} as StockFormState);
  return (
    <WastageFields
      key={JSON.stringify(state.values ?? state.itemId ?? null)}
      {...props}
      state={state}
      formAction={formAction}
      pending={pending}
      initialItemId={state.values?.item_id ?? state.itemId ?? props.initialItemId ?? ""}
    />
  );
}

function WastageFields({
  state,
  formAction,
  pending,
  items,
  batches,
  today,
  initialItemId,
}: Props & { state: StockFormState; formAction: (fd: FormData) => void; pending: boolean; initialItemId: string }) {
  const [itemId, setItemId] = useState(initialItemId);
  const [reason, setReason] = useState(state.values?.reason ?? "");
  const item = items.find((i) => i.id === itemId);
  const itemBatches = batches.filter((b) => b.itemId === itemId);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormStatus state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <ItemPicker items={items} value={itemId} onChange={setItemId} error={e.item_id} />
        </div>
        <QuantityInput id="quantity" label="Quantity wasted" unit={item?.unit} defaultValue={v.quantity} error={e.quantity} />
        <FormField
          id="batch_id"
          label="Batch"
          error={e.batch_id}
          hint="Optional. Pick the batch that was thrown away, e.g. an expired lot."
        >
          <NativeSelect {...fieldAria("batch_id", e.batch_id, "hint")} defaultValue={v.batch_id ?? ""} disabled={itemBatches.length === 0}>
            <option value="">Oldest expiry first (automatic)</option>
            {item &&
              itemBatches.map((b) => {
                const expired = b.expirationDate !== null && b.expirationDate < today;
                return (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber ?? "No batch no."} · {formatQuantity(b.remaining, item.unit)} left
                    {b.expirationDate ? ` · ${expired ? "EXPIRED" : "expires"} ${b.expirationDate}` : ""}
                  </option>
                );
              })}
          </NativeSelect>
        </FormField>
        <FormField id="reason" label="Reason" required error={e.reason}>
          <NativeSelect {...fieldAria("reason", e.reason)} value={reason} onChange={(ev) => setReason(ev.target.value)} required>
            <option value="">Select a reason…</option>
            {WASTAGE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other…</option>
          </NativeSelect>
        </FormField>
        <OccurredAtField label="Wasted at" error={e.occurred_at} />
        {reason === "Other" && (
          <div className="md:col-span-2">
            <FormField id="reason_other" label="Describe the reason" required error={e.reason_other}>
              <Input {...fieldAria("reason_other", e.reason_other)} maxLength={200} required defaultValue={v.reason_other} />
            </FormField>
          </div>
        )}
        <div className="md:col-span-2">
          <FormField id="note" label="Note" error={e.note}>
            <Textarea {...fieldAria("note", e.note)} rows={2} maxLength={1000} defaultValue={v.note} />
          </FormField>
        </div>
      </div>
      <Button type="submit" variant="destructive" disabled={pending || items.length === 0}>
        {pending ? "Saving…" : "Record wastage"}
      </Button>
    </form>
  );
}
