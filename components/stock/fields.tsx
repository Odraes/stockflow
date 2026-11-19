"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { StockFormState } from "@/lib/actions/stock";
import type { StockItemOption } from "@/lib/data/stock";
import { formatQuantity } from "@/lib/stock";

/** Item dropdown. Reports the chosen item so the form can show its unit and stock. */
export function ItemPicker({
  items,
  value,
  onChange,
  error,
  showUsable = false,
}: {
  items: StockItemOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  showUsable?: boolean;
}) {
  const selected = items.find((i) => i.id === value);
  const hint = selected
    ? showUsable && selected.usable !== selected.quantity
      ? `In stock: ${formatQuantity(selected.quantity, selected.unit)} · usable (not expired): ${formatQuantity(selected.usable, selected.unit)}`
      : `In stock: ${formatQuantity(selected.quantity, selected.unit)}`
    : items.length === 0
      ? "No items yet — add them on the Inventory page first."
      : undefined;

  return (
    <FormField id="item_id" label="Item" required error={error} hint={hint}>
      <NativeSelect {...fieldAria("item_id", error, hint)} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Select an item…</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} ({i.sku}){i.isActive ? "" : " — archived"}
          </option>
        ))}
      </NativeSelect>
      {/* The unit travels with the form so the database can reject a mismatch. */}
      <input type="hidden" name="unit" value={selected?.unit ?? ""} />
    </FormField>
  );
}

/** Number input with the item's unit shown inside the field. */
export function QuantityInput({
  id,
  label,
  unit,
  defaultValue,
  error,
  hint,
  allowZero = false,
}: {
  id: string;
  label: string;
  unit?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  allowZero?: boolean;
}) {
  return (
    <FormField id={id} label={label} required error={error} hint={hint}>
      <div className="relative">
        <Input
          {...fieldAria(id, error, hint)}
          type="number"
          inputMode="decimal"
          min={allowZero ? 0 : 0.001}
          step="0.001"
          required
          defaultValue={defaultValue}
          className="pr-12"
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </FormField>
  );
}

/**
 * Optional "when did this happen?". The <input type="datetime-local"> shows
 * the user's local time; we convert it to an exact UTC instant in the browser
 * (which knows the user's time zone) and send that in a hidden field.
 */
export function OccurredAtField({ label = "When", error }: { label?: string; error?: string }) {
  const [local, setLocal] = useState("");
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <FormField id="occurred_at_local" label={label} error={error} hint="Leave empty for “now”.">
      <Input
        id="occurred_at_local"
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "occurred_at_local-error" : "occurred_at_local-hint"}
      />
      <input type="hidden" name="occurred_at" value={iso} />
    </FormField>
  );
}

/** Success / error banner shown above a stock form. */
export function FormStatus({ state }: { state: StockFormState }) {
  if (state.ok && state.message) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>{state.message}</span>
        {state.itemId && (
          <Link href={`/inventory/${state.itemId}`} className="font-medium underline underline-offset-4">
            View item
          </Link>
        )}
      </div>
    );
  }
  if (state.message) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.message}
      </p>
    );
  }
  return null;
}
