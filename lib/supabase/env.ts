/**
 * Central place to read the public Supabase settings.
 *
 * Why the variables are written out literally (process.env.NEXT_PUBLIC_...):
 * Next.js replaces `process.env.NEXT_PUBLIC_*` with the real value at BUILD
 * time so the browser bundle can use it. That replacement only works when the
 * full name appears in the code — `process.env[name]` would be `undefined` in
 * the browser.
 *
 * Only PUBLIC values belong here. The publishable key is designed to be seen
 * by browsers; Row Level Security (RLS) in the database is what actually
 * protects the data. Never add a service-role / secret key to a NEXT_PUBLIC_
 * variable.
 */

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

const PLACEHOLDERS = new Set(["your-project-url", "your-publishable-or-anon-key"]);

function isSet(value: string | undefined): value is string {
  return !!value && !PLACEHOLDERS.has(value);
}

/** True when both Supabase variables are configured with real values. */
export const hasSupabaseEnv =
  isSet(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  isSet(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/**
 * Returns the Supabase settings, or throws a clear, actionable error if they
 * are missing — instead of failing later with a confusing message.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing: string[] = [];
  if (!isSet(url)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!isSet(publishableKey)) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in the values from your " +
        "Supabase dashboard (Project Settings → API Keys), then restart `npm run dev`.",
    );
  }

  return { url: url as string, publishableKey: publishableKey as string };
}
