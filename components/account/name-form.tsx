"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { updateDisplayName, type AccountFormState } from "@/app/(app)/account/actions";

export function NameForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayName, {} as AccountFormState);
  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <FormField id="full_name" label="Display name" required error={state.error}
          hint="Shown next to every delivery, usage and wastage you record.">
          <Input id="full_name" name="full_name" defaultValue={currentName} required maxLength={120} autoComplete="name"
            aria-describedby={state.error ? "full_name-error" : "full_name-hint"} />
        </FormField>
      </div>
      <Button type="submit" disabled={pending} className="sm:mt-6">{pending ? "Saving…" : "Save"}</Button>
      {state.ok && <p role="status" className="text-sm text-success sm:mt-8">{state.message}</p>}
    </form>
  );
}
