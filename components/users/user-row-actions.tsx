"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateUserRole, updateUserStatus } from "@/app/(app)/users/actions";
import type { ActionResult } from "@/lib/db-errors";
import { APP_ROLES, ROLE_LABELS, type AccountStatus, type AppRole } from "@/lib/permissions";

type Props = {
  userId: string;
  role: AppRole;
  status: AccountStatus;
  name: string;
};

/**
 * Role selector + approve/disable buttons for one user.
 * useTransition keeps the UI responsive and gives us a "pending" flag while
 * the Server Action runs.
 */
export function UserRowActions({ userId, role, status, name }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = (action: () => Promise<ActionResult>) => {
    setResult(null);
    startTransition(async () => {
      setResult(await action());
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>
          Role for {name}
        </label>
        <select
          id={`role-${userId}`}
          value={role}
          disabled={isPending}
          onChange={(e) => run(() => updateUserRole(userId, e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        >
          {APP_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        {status === "pending" && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => updateUserStatus(userId, "active"))}>
            Approve
          </Button>
        )}
        {status === "active" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(`Disable ${name}? They will lose access immediately.`)) {
                run(() => updateUserStatus(userId, "disabled"));
              }
            }}
          >
            Disable
          </Button>
        )}
        {status === "disabled" && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => updateUserStatus(userId, "active"))}>
            Re-enable
          </Button>
        )}
      </div>

      <p aria-live="polite" className="min-h-4 text-xs">
        {isPending && <span className="text-muted-foreground">Saving…</span>}
        {!isPending && result?.ok === true && <span className="text-emerald-600 dark:text-emerald-400">{result.message}</span>}
        {!isPending && result?.ok === false && <span className="text-destructive">{result.error}</span>}
      </p>
    </div>
  );
}
