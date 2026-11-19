"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

export type AccountFormState = { ok?: boolean; message?: string; error?: string };

/** Users may change their OWN display name (RLS + column grant allow only that). */
export async function updateDisplayName(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireActiveUser();
  const name = String(formData.get("full_name") ?? "").trim();
  if (!name) return { error: "Enter your name." };
  if (name.length > 120) return { error: "Name must be 120 characters or fewer." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
  if (error) return { error: friendlyDbError(error) };

  // The name appears in the top bar and in every history list.
  revalidatePath("/", "layout");
  return { ok: true, message: "Name saved. It now appears on your stock records." };
}
