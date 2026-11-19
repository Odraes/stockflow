"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus, ItemPicker, OccurredAtField, QuantityInput } from "@/components/stock/fields";
import { recordUsageAction, type StockFormState } from "@/lib/actions/stock";
import type { StockItemOption } from "@/lib/data/stock";

const QUICK_REASONS = ["Drink preparation", "Food preparation", "Takeaway orders", "Staff meal", "Cleaning"];

type Props = { items: StockItemOption[]; initialItemId?: string };

export function UsageForm({ items, initialItemId = "" }: Props) {
  const [state, formAction, pending] = useActionState(recordUsageAction, {} as StockFormState);
  return (
    <UsageFields
      key={JSON.stringify(state.values ?? state.itemId ?? null)}
      state={state}
      formAction={formAction}
      pending={pending}
      items={items}
      initialItemId={state.values?.item_id ?? state.itemId ?? initialItemId}
    />
  );
}

function UsageFields({
  state,
  formAction,
  pending,
  items,
  initialItemId,
}: { state: StockFormState; formAction: (fd: FormData) => void; pending: boolean; items: StockItemOption[]; initialItemId: string }) {
  const [itemId, setItemId] = useState(initialItemId);
  const [reason, setReason] = useState(state.values?.reason ?? "");
  const item = items.find((i) => i.id === itemId);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormStatus state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <ItemPicker items={items} value={itemId} onChange={setItemId} error={e.item_id} showUsable />
        </div>
        <QuantityInput
          id="quantity"
          label="Quantity used"
          unit={item?.unit}
          defaultValue={v.quantity}
          error={e.quantity}
          hint="Taken from the batch that expires first."
        />
        <OccurredAtField label="Used at" error={e.occurred_at} />
        <div className="md:col-span-2">
          <FormField id="reason" label="Reason" error={e.reason}>
            <Input {...fieldAria("reason", e.reason)} maxLength={200} value={reason} onChange={(ev) => setReason(ev.target.value)} />
          </FormField>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <FormField id="note" label="Note" error={e.note}>
            <Textarea {...fieldAria("note", e.note)} rows={2} maxLength={1000} defaultValue={v.note} />
          </FormField>
        </div>
      </div>
      <Button type="submit" disabled={pending || items.length === 0}>
        {pending ? "Saving…" : "Record usage"}
      </Button>
    </form>
  );
}
