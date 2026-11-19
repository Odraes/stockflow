"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SupplierFormState } from "@/app/(app)/suppliers/actions";
import type { SupplierFormValues } from "@/lib/validations/supplier";

type Props = {
  action: (state: SupplierFormState, formData: FormData) => Promise<SupplierFormState>;
  initialValues: SupplierFormValues;
  submitLabel: string;
  cancelHref: string;
};

export function SupplierForm({ action, initialValues, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? initialValues;
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} key={JSON.stringify(state.values ?? null)} className="space-y-6">
      {state.message && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="name" label="Supplier name" required error={e.name}>
          <Input {...fieldAria("name", e.name)} defaultValue={v.name} required maxLength={120} />
        </FormField>
        <FormField id="contact_person" label="Contact person" error={e.contact_person}>
          <Input {...fieldAria("contact_person", e.contact_person)} defaultValue={v.contact_person} maxLength={120} autoComplete="off" />
        </FormField>
        <FormField id="phone" label="Phone" error={e.phone}>
          <Input {...fieldAria("phone", e.phone)} type="tel" defaultValue={v.phone} maxLength={40} autoComplete="off" />
        </FormField>
        <FormField id="email" label="Email" error={e.email}>
          <Input {...fieldAria("email", e.email)} type="email" defaultValue={v.email} maxLength={254} autoComplete="off" />
        </FormField>
        <div className="md:col-span-2">
          <FormField id="address" label="Address" error={e.address}>
            <Textarea {...fieldAria("address", e.address)} defaultValue={v.address} maxLength={500} rows={2} />
          </FormField>
        </div>
        <div className="md:col-span-2">
          <FormField id="notes" label="Notes" error={e.notes} hint="Delivery days, order cut-off times, minimum order, etc.">
            <Textarea {...fieldAria("notes", e.notes, "hint")} defaultValue={v.notes} maxLength={2000} rows={3} />
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
