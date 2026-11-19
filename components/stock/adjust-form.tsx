"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/stock/fields";
import { adjustStockAction, type StockFormState } from "@/lib/actions/stock";
import { formatQuantity, type StockUnit } from "@/lib/stock";

type Props = { itemId: string; unit: StockUnit; currentQuantity: number };

const REASONS = ["Physical stock count", "Previously unrecorded stock", "Audit correction"];

/** "I counted X" → the database calculates and records the difference. */
export function AdjustForm({ itemId, unit, currentQuantity }: Props) {
  const [state, formAction, pending] = useActionState(adjustStockAction, {} as StockFormState);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [counted, setCounted] = useState(v.new_quantity ?? "");
  const [reason, setReason] = useState(v.reason ?? "");
  const diff = counted === "" || Number.isNaN(Number(counted)) ? null : Number(counted) - currentQuantity;

  return (
    <form action={formAction} className="space-y-6">
      <FormStatus state={state} />
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="unit" value={unit} />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="new_quantity" label="Counted quantity" required error={e.new_quantity ?? e.quantity}
          hint={diff === null || diff === 0 ? `Currently recorded: ${formatQuantity(currentQuantity, unit)}` : `Difference: ${diff > 0 ? "+" : "−"}${formatQuantity(Math.abs(diff), unit)}`}>
          <div className="relative">
            <Input
              {...fieldAria("new_quantity", e.new_quantity, "hint")}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.001"
              required
              value={counted}
              onChange={(ev) => setCounted(ev.target.value)}
              className="pr-12"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>
          </div>
        </FormField>
        <FormField id="expiration_date" label="Expiration date for added stock" error={e.expiration_date}
          hint="Only used when the count is higher than recorded.">
          <Input {...fieldAria("expiration_date", e.expiration_date, "hint")} type="date" defaultValue={v.expiration_date} disabled={diff !== null && diff <= 0} />
        </FormField>
        <div className="md:col-span-2">
          <FormField id="reason" label="Reason" required error={e.reason}>
            <Input {...fieldAria("reason", e.reason)} maxLength={200} required value={reason} onChange={(ev) => setReason(ev.target.value)} />
          </FormField>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground">
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
      <Button type="submit" disabled={pending || diff === 0}>
        {pending ? "Saving…" : "Record adjustment"}
      </Button>
    </form>
  );
}
