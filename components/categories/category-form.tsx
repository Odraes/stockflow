"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { CategoryFormState } from "@/app/(app)/categories/actions";

type Props = {
  action: (state: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  initial?: { name: string; description: string };
  submitLabel: string;
  idPrefix: string;
  onDone?: () => void;
  onCancel?: () => void;
};

/** Used for both "new category" and inline editing. */
export function CategoryForm({ action, initial, submitLabel, idPrefix, onDone, onCancel }: Props) {
  const [state, formAction, pending] = useActionState(async (prev: CategoryFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone?.();
    return result;
  }, {});

  const values = state.values ?? initial ?? { name: "", description: "" };
  const nameId = `${idPrefix}-name`;
  const descId = `${idPrefix}-description`;

  return (
    <form action={formAction} key={JSON.stringify(state.values ?? null)} className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-start">
      <FormField id={nameId} label="Name" required error={state.fieldErrors?.name}>
        <Input {...fieldAria(nameId, state.fieldErrors?.name)} name="name" defaultValue={values.name} required maxLength={80} />
      </FormField>
      <FormField id={descId} label="Description" error={state.fieldErrors?.description}>
        <Input {...fieldAria(descId, state.fieldErrors?.description)} name="description" defaultValue={values.description} maxLength={500} />
      </FormField>
      <div className="flex gap-2 md:pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-sm md:col-span-3">
        {state.message && <span className={state.ok ? "text-success" : "text-destructive"}>{state.message}</span>}
      </p>
    </form>
  );
}
