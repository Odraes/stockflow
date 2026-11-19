import type { FieldErrors, ParseResult } from "@/lib/validations/item";

/** Mirrors the suppliers table constraints (see the schema migration). */

export type SupplierInput = {
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};
export type SupplierField = keyof SupplierInput;
export type SupplierFormValues = Record<SupplierField, string>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^[0-9+()\-.\s/]{3,40}$/;

export function readSupplierForm(formData: FormData): SupplierFormValues {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    name: get("name"),
    contact_person: get("contact_person"),
    phone: get("phone"),
    email: get("email"),
    address: get("address"),
    notes: get("notes"),
  };
}

export function parseSupplier(v: SupplierFormValues): ParseResult<SupplierInput, SupplierField> {
  const errors: FieldErrors<SupplierField> = {};

  if (!v.name) errors.name = "Name is required.";
  else if (v.name.length > 120) errors.name = "Name must be 120 characters or fewer.";
  if (v.contact_person.length > 120) errors.contact_person = "Must be 120 characters or fewer.";
  if (v.phone && !PHONE_RE.test(v.phone)) errors.phone = "Use digits, spaces and + ( ) - . / only.";
  if (v.email && (!EMAIL_RE.test(v.email) || v.email.length > 254)) errors.email = "Enter a valid email address.";
  if (v.address.length > 500) errors.address = "Address must be 500 characters or fewer.";
  if (v.notes.length > 2000) errors.notes = "Notes must be 2000 characters or fewer.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: v.name,
      contact_person: v.contact_person || null,
      phone: v.phone || null,
      email: v.email ? v.email.toLowerCase() : null,
      address: v.address || null,
      notes: v.notes || null,
    },
  };
}
