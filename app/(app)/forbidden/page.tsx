import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">You don&apos;t have access to this page</h1>
      <p className="text-sm text-muted-foreground">
        Your role doesn&apos;t include this feature. Ask an administrator if you think this is a mistake.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
