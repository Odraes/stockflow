/**
 * Turn a Supabase/PostgREST error into a message that is safe and useful to
 * show a café employee.
 *
 * Our own database functions raise deliberate, human-readable messages with
 * known codes (see the stock_functions migration), so those are passed
 * through. Anything else could expose internal details (table names, SQL), so
 * it becomes a generic message and the details go to the server log.
 */

type DbError = { code?: string; message: string; hint?: string | null };

const PASS_THROUGH_CODES = new Set([
  "42501", // permission denied (our functions explain why)
  "P0002", // not found
  "22023", // invalid input
  "SP001", // insufficient stock
]);

export function friendlyDbError(error: DbError): string {
  if (error.code && PASS_THROUGH_CODES.has(error.code)) {
    return error.hint ? `${error.message}. ${error.hint}` : error.message;
  }
  switch (error.code) {
    case "23505":
      return "That value already exists. Please use a different one.";
    case "23503":
      return "This record is still in use and cannot be removed.";
    case "23514":
      return "The values entered are not valid.";
    default:
      console.error("Unexpected database error:", error);
      return "Something went wrong. Please try again.";
  }
}

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };
