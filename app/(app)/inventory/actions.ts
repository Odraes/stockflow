"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { friendlyDbError, type ActionResult } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validations/common";
import {
  parseItem,
  readItemForm,
  type FieldErrors,
  type ItemField,
  type ItemFormValues,
} from "@/lib/validations/item";

/** What the item form receives back after a failed submit. */
export type ItemFormState = {
  message?: string;
  fieldErrors?: FieldErrors<ItemField>;
  values?: ItemFormValues;
};

function dbErrorToState(
  error: { code?: string; message: string; hint?: string | null },
  values: ItemFormValues,
): ItemFormState {
  if (error.code === "23505") {
    return { values, fieldErrors: { sku: "Another item already uses this SKU." } };
  }
  if (error.code === "23503") {
    return { values, message: "The selected category or supplier no longer exists. Reload and try again." };
  }
  return { values, message: friendlyDbError(error) };
}

export async function createItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  await requirePermission("inventory:manage");

  const values = readItemForm(formData);
  const parsed = parseItem(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };

  const supabase = await createClient();
  // `quantity` is not sent (and not even grantable): new items start at 0 and
  // stock only changes through the audited stock functions.
  const { data, error } = await supabase.from("items").insert(parsed.data).select("id").single();
  if (error) return dbErrorToState(error, values);

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/inventory/${data.id}?saved=created`);
}

export async function updateItem(
  itemId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requirePermission("inventory:manage");
  if (!isUuid(itemId)) return { message: "Invalid item." };

  const values = readItemForm(formData);
  const parsed = parseItem(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.errors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("items").update(parsed.data).eq("id", itemId).select("id");
  if (error) return dbErrorToState(error, values);
  if (!data || data.length === 0) return { values, message: "Item not found or you are not allowed to edit it." };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/dashboard");
  redirect(`/inventory/${itemId}?saved=updated`);
}

export async function setItemArchived(itemId: string, archived: unknown): Promise<ActionResult> {
  await requirePermission("inventory:manage");
  if (!isUuid(itemId) || typeof archived !== "boolean") return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .update({ is_active: !archived })
    .eq("id", itemId)
    .select("id");
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!data || data.length === 0) return { ok: false, error: "Item not found or you are not allowed to change it." };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: archived ? "Item archived. Its history is kept." : "Item restored." };
}
