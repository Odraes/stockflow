import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends already signed-in visitors from the login/sign-up forms to the app.
 * Render it inside <Suspense> (it reads the session cookie).
 */
export async function RedirectIfSignedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/dashboard");
  return null;
}
