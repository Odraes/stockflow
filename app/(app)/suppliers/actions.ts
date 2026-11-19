"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { friendlyDbError, type ActionResult } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validations/common";
import type { FieldErrors } from "@/lib/validations/item";
import {
  parseSupplier,
  readSupplierForm,
  type SupplierField,
  type SupplierFormValues,
} from "@/lib/validations/supplier";

export type SupplierFormState = {
  message?: string;
  fieldErrors?: FieldErrors<SupplierField>;
  values?: SupplierFormValues;
};

function toState(error: { code?: string; message: string; hint?: string | null }, values: SupplierFormValues): SupplierFormState {
  if (error.code === "23505") return { values, fieldErrors: { name: "A supplier with this name already exists." } };
  if (error.code === "23514") return { values, message: "Some values are not valid. Check the email address and lengths." };
  return { values, message: friendlyDbError(error) };
}

function refresh(id?: string) {
  revalidatePath("/suppliers");
  if (id) revalidatePath(`/suppliers/${id}`);
  revalidatePath("/inventory");
}

export async function createSupplier(_prev: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  await requirePermission("suppliers:manage");
  const values = readSupplierForm(formData);
  const parsed = parseSupplier(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").insert(parsed.data).select("id").single();
  if (error) return toState(error, values);

  refresh();
  redirect(`/suppliers/${data.id}?saved=created`);
}

export async function updateSupplier(supplierId: string, _prev: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  await requirePermission("suppliers:manage");
  if (!isUuid(supplierId)) return { message: "Invalid supplier." };
  const values = readSupplierForm(formData);
  const parsed = parseSupplier(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").update(parsed.data).eq("id", supplierId).select("id");
  if (error) return toState(error, values);
  if (!data?.length) return { values, message: "Supplier not found or you are not allowed to edit it." };

  refresh(supplierId);
  redirect(`/suppliers/${supplierId}?saved=updated`);
}

export async function setSupplierArchived(supplierId: string, archived: unknown): Promise<ActionResult> {
  await requirePermission("suppliers:manage");
  if (!isUuid(supplierId) || typeof archived !== "boolean") return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update({ is_active: !archived })
    .eq("id", supplierId)
    .select("id");
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!data?.length) return { ok: false, error: "Supplier not found or you are not allowed to change it." };

  refresh(supplierId);
  return { ok: true, message: archived ? "Supplier archived." : "Supplier restored." };
}
