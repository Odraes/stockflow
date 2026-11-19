import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validations/common";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * Landing route for links in Supabase emails (sign-up confirmation, password
 * reset). Supports both link styles Supabase can send:
 *   - ?code=...                       (PKCE, Supabase's default templates)
 *   - ?token_hash=...&type=...        (custom email templates)
 *
 * `next` is only followed if it is a path on this site (no open redirects).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();
  let errorMessage = "The link is invalid or incomplete.";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    errorMessage = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
    errorMessage = error.message;
  }

  redirect(`/auth/error?error=${encodeURIComponent(errorMessage)}`);
}
