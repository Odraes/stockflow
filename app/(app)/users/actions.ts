"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError, type ActionResult } from "@/lib/db-errors";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/permissions";
import { isAccountStatus, isAppRole, isUuid } from "@/lib/validations/common";

/*
 * Server Actions are public HTTP endpoints: anyone can call them with any
 * arguments, even without using our UI. So each action:
 *   1. checks the caller's permission on the server,
 *   2. validates every argument at runtime,
 *   3. calls a database function that checks permissions AGAIN.
 */

export async function updateUserRole(userId: unknown, role: unknown): Promise<ActionResult> {
  const admin = await requirePermission("users:manage");
  if (!isUuid(userId) || !isAppRole(role)) {
    return { ok: false, error: "Invalid request." };
  }
  if (userId === admin.id) {
    return { ok: false, error: "You cannot change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/users");
  return { ok: true, message: `Role changed to ${ROLE_LABELS[role]}.` };
}

export async function updateUserStatus(userId: unknown, status: unknown): Promise<ActionResult> {
  const admin = await requirePermission("users:manage");
  if (!isUuid(userId) || !isAccountStatus(status)) {
    return { ok: false, error: "Invalid request." };
  }
  if (userId === admin.id) {
    return { ok: false, error: "You cannot change your own account status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_status", { p_user_id: userId, p_status: status });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/users");
  return { ok: true, message: `Account is now ${STATUS_LABELS[status].toLowerCase()}.` };
}
