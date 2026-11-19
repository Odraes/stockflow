"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when a page inside the app throws (e.g. the database is unreachable).
 * Error boundaries must be Client Components. `reset` re-renders the page.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page could not be loaded. Check your connection and try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
