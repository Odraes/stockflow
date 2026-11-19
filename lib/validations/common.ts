import {
  ACCOUNT_STATUSES,
  APP_ROLES,
  type AccountStatus,
  type AppRole,
} from "@/lib/permissions";

/**
 * Small runtime validators for values arriving from the browser.
 *
 * TypeScript types disappear at runtime: a Server Action declared as
 * `(role: AppRole)` can still receive "superuser" from a crafted request.
 * So anything coming from the client is validated before use.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return typeof value === "string" && (ACCOUNT_STATUSES as readonly string[]).includes(value);
}

/**
 * Only allow redirects to paths on THIS site ("/dashboard"), never to other
 * sites ("https://evil.example" or "//evil.example"). Prevents open redirects.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

/**
 * Clean free-text search before it goes into a PostgREST filter. The filter
 * syntax uses , ( ) * % \ quotes and : as operators, so we remove them; the
 * search can then never change the meaning of the filter itself.
 */
export function sanitizeSearch(value: string, maxLength = 80): string {
  return value.replace(/[,()*%\\"':]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
