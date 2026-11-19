import type { FieldErrors, ParseResult } from "@/lib/validations/item";

export type CategoryInput = { name: string; description: string | null };
export type CategoryField = keyof CategoryInput;

export function parseCategory(formData: FormData): ParseResult<CategoryInput, CategoryField> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const errors: FieldErrors<CategoryField> = {};

  if (!name) errors.name = "Name is required.";
  else if (name.length > 80) errors.name = "Name must be 80 characters or fewer.";
  if (description.length > 500) errors.description = "Description must be 500 characters or fewer.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, description: description || null } };
}
