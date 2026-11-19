import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Clock, Ban } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Awaiting approval" };

/** Where signed-in users land while their account is pending or disabled. */
export default function PendingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Brand href="/pending" />
      <Suspense fallback={<div className="h-48 w-full max-w-sm animate-pulse rounded-xl bg-muted" />}>
        <AccountStatusCard />
      </Suspense>
    </main>
  );
}

async function AccountStatusCard() {
  const user = await requireUser();
  if (user.status === "active") redirect("/dashboard");

  const disabled = user.status === "disabled";
  const Icon = disabled ? Ban : Clock;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <Icon className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
        <CardTitle>{disabled ? "Account disabled" : "Waiting for approval"}</CardTitle>
        <CardDescription>
          Signed in as <span className="font-medium">{user.email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {disabled
            ? "An administrator has disabled your account. Contact them if you need access again."
            : "Your account was created, but an administrator still needs to approve it. Try again once they have."}
        </p>
        <LogoutButton />
      </CardContent>
    </Card>
  );
}
