"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ItemFormState } from "@/app/(app)/inventory/actions";
import type { Option } from "@/lib/data/inventory";
import { STOCK_UNITS, UNIT_LABELS, type ItemFormValues } from "@/lib/validations/item";

type Props = {
  /** A Server Action (createItem, or updateItem bound to an id). */
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  initialValues: ItemFormValues;
  categories: Option[];
  suppliers: Option[];
  submitLabel: string;
  cancelHref: string;
  /** Unit can't change once the item has stock history (the database enforces this too). */
  unitLocked?: boolean;
};

/**
 * Shared create/edit form. `useActionState` sends the form to the Server
 * Action and gives us back its result (field errors) plus a pending flag.
 * HTML attributes (required, maxLength, min) give instant feedback; the
 * server validates again because browser checks can be bypassed.
 */
export function ItemForm({ action, initialValues, categories, suppliers, submitLabel, cancelHref, unitLocked }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initialValues;
  const errors = state.fieldErrors ?? {};

  return (
    // key: re-mount inputs with the server-returned values after an error
    <form action={formAction} key={JSON.stringify(state.values ?? null)} className="space-y-6">
      {state.message && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="name" label="Name" required error={errors.name}>
          <Input {...fieldAria("name", errors.name)} defaultValue={values.name} required maxLength={120} placeholder="Fresh milk" />
        </FormField>

        <FormField id="sku" label="SKU / item code" required error={errors.sku} hint="Unique code, e.g. MILK-FRESH-1L. Saved in capitals.">
          <Input
            {...fieldAria("sku", errors.sku, "hint")}
            defaultValue={values.sku}
            required
            maxLength={64}
            autoCapitalize="characters"
            className="uppercase"
          />
        </FormField>

        <FormField id="category_id" label="Category" required error={errors.category_id}>
          <NativeSelect {...fieldAria("category_id", errors.category_id)} defaultValue={values.category_id} required>
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField
          id="supplier_id"
          label="Preferred supplier"
          error={errors.supplier_id}
          hint={suppliers.length === 0 ? "No suppliers yet — they can be added in a later phase." : undefined}
        >
          <NativeSelect {...fieldAria("supplier_id", errors.supplier_id)} defaultValue={values.supplier_id}>
            <option value="">None</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField
          id="unit"
          label="Base unit"
          required
          error={errors.unit}
          hint={
            unitLocked
              ? "Locked: this item already has stock history in this unit."
              : "All quantities for this item are stored in this unit (e.g. 1 L of milk = 1000 ml)."
          }
        >
          {unitLocked ? (
            <>
              {/* Disabled inputs aren't submitted, so send the value in a hidden field. */}
              <input type="hidden" name="unit" value={values.unit} />
              <NativeSelect id="unit" value={values.unit} disabled aria-describedby="unit-hint">
                {STOCK_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </NativeSelect>
            </>
          ) : (
            <NativeSelect {...fieldAria("unit", errors.unit, "hint")} defaultValue={values.unit} required>
              <option value="">Select a unit…</option>
              {STOCK_UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>

        <FormField id="min_stock" label="Minimum stock level" error={errors.min_stock} hint="You'll get a low-stock alert at or below this amount.">
          <Input
            {...fieldAria("min_stock", errors.min_stock, "hint")}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.001"
            defaultValue={values.min_stock}
          />
        </FormField>

        <FormField id="location" label="Storage location" error={errors.location}>
          <Input {...fieldAria("location", errors.location)} defaultValue={values.location} maxLength={120} placeholder="Walk-in fridge, shelf 2" />
        </FormField>

        <div className="md:col-span-2">
          <FormField id="description" label="Description" error={errors.description}>
            <Textarea {...fieldAria("description", errors.description)} defaultValue={values.description} maxLength={1000} rows={3} />
          </FormField>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
