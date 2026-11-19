import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  can,
  type AccountStatus,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

/**
 * Data Access Layer for authentication.
 *
 * Every server page, layout and Server Action asks THIS file who the user
 * is. Centralising it means one place to get security right.
 *
 * - `getClaims()` verifies the login token's signature (unlike reading the
 *   cookie blindly), so a forged cookie is rejected.
 * - The role/status come from the `profiles` table, never from the token or
 *   anything the browser sends.
 * - `cache()` remembers the result for the current request only, so a layout
 *   and a page asking for the user trigger one lookup, not two.
 */

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  status: AccountStatus;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load your profile. Please try again.");
  }
  if (!profile) {
    // Should not happen: a database trigger creates a profile for every user.
    throw new Error("Your account has no profile. Please contact an administrator.");
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile.full_name,
    role: profile.role,
    status: profile.status,
  };
});

/** Any logged-in user (including pending/disabled). Otherwise → login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

/** A logged-in, ADMIN-APPROVED user. Pending/disabled → /pending. */
export async function requireActiveUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.status !== "active") redirect("/pending");
  return user;
}

/** An active user whose role has `permission`. Otherwise → /forbidden. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireActiveUser();
  if (!can(user.role, permission)) redirect("/forbidden");
  return user;
}
