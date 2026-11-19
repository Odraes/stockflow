import type { Metadata } from "next";
import { NameForm } from "@/components/account/name-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireActiveUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            {user.email} · {ROLE_LABELS[user.role]}. Only an administrator can change roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NameForm currentName={user.fullName ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
