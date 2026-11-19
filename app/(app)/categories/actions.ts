"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validations/common";
import { parseCategory, type CategoryField } from "@/lib/validations/category";
import type { FieldErrors } from "@/lib/validations/item";

export type CategoryFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: FieldErrors<CategoryField>;
  /** What the user typed, returned on errors so the form can be re-filled. */
  values?: { name: string; description: string };
};

const typed = (formData: FormData) => ({
  name: String(formData.get("name") ?? ""),
  description: String(formData.get("description") ?? ""),
});

function refresh() {
  revalidatePath("/categories");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

function toState(error: { code?: string; message: string; hint?: string | null }): CategoryFormState {
  if (error.code === "23505") return { fieldErrors: { name: "A category with this name already exists." } };
  return { message: friendlyDbError(error) };
}

export async function createCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requirePermission("categories:manage");
  const parsed = parseCategory(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors, values: typed(formData) };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) return { ...toState(error), values: typed(formData) };

  refresh();
  return { ok: true, message: `Category "${parsed.data.name}" created.` };
}

export async function updateCategory(
  categoryId: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requirePermission("categories:manage");
  if (!isUuid(categoryId)) return { message: "Invalid category." };
  const parsed = parseCategory(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors, values: typed(formData) };

  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").update(parsed.data).eq("id", categoryId).select("id");
  if (error) return { ...toState(error), values: typed(formData) };
  if (!data?.length) return { message: "Category not found." };

  refresh();
  return { ok: true, message: "Category updated." };
}

export async function deleteCategory(categoryId: unknown): Promise<CategoryFormState> {
  await requirePermission("categories:manage");
  if (!isUuid(categoryId)) return { message: "Invalid category." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").delete().eq("id", categoryId).select("id");
  if (error) {
    // 23503 = foreign key violation: items (active or archived) still use it.
    if (error.code === "23503") {
      return { message: "This category is still used by inventory items (including archived ones). Move them first." };
    }
    return { message: friendlyDbError(error) };
  }
  if (!data?.length) return { message: "Category not found." };

  refresh();
  return { ok: true, message: "Category deleted." };
}
