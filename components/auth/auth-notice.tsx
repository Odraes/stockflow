"use client";

import { useSearchParams } from "next/navigation";

/**
 * Shows a fixed message for a known `?notice=` key. Only keys listed here are
 * rendered, so the URL can't inject arbitrary text into the page.
 */
const NOTICES: Record<string, string> = {
  "email-confirmed": "Your email is confirmed. Please log in to continue.",
  "reset-other-browser":
    "That reset link must be opened in the same browser you requested it from. Request a new link below and open it in this browser.",
};

export function AuthNotice() {
  const notice = useSearchParams().get("notice");
  const message = notice ? NOTICES[notice] : undefined;
  if (!message) return null;

  return (
    <p role="status" className="mb-4 rounded-md border bg-muted px-4 py-3 text-sm">
      {message}
    </p>
  );
}
