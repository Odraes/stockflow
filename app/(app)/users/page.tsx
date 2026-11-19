import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRowActions } from "@/components/users/user-row-actions";
import { requirePermission } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, STATUS_LABELS, type AccountStatus } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "User Management" };

const STATUS_BADGE: Record<AccountStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  active: "secondary",
  disabled: "destructive",
};

export default async function UsersPage() {
  const me = await requirePermission("users:manage");

  const supabase = await createClient();
  const { data: users, error } = await supabase.rpc("admin_list_users");

  const pendingCount = users?.filter((u) => u.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Approve new accounts, assign roles and disable access. You cannot change your own account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            {pendingCount > 0
              ? `${pendingCount} account${pendingCount === 1 ? "" : "s"} waiting for approval.`
              : "No accounts are waiting for approval."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{friendlyDbError(error)}</p>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="hidden py-2 pr-4 font-medium md:table-cell">Joined</th>
                    <th className="hidden py-2 pr-4 font-medium lg:table-cell">Last sign-in</th>
                    <th className="py-2 text-right font-medium">Role &amp; access</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const name = u.full_name || u.email;
                    const isMe = u.id === me.id;
                    return (
                      <tr key={u.id} className="border-b align-top last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          {!u.email_confirmed_at && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">Email not confirmed</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_BADGE[u.status]}>{STATUS_LABELS[u.status]}</Badge>
                        </td>
                        <td className="hidden py-3 pr-4 text-muted-foreground md:table-cell">
                          {formatDateTime(u.created_at)}
                        </td>
                        <td className="hidden py-3 pr-4 text-muted-foreground lg:table-cell">
                          {u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : "Never"}
                        </td>
                        <td className="py-3 text-right">
                          {isMe ? (
                            <span className="text-sm text-muted-foreground">
                              {ROLE_LABELS[u.role]} (you)
                            </span>
                          ) : (
                            <UserRowActions userId={u.id} role={u.role} status={u.status} name={name} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
