import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when a page calls notFound(), e.g. an item id that doesn't exist. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">
        This item or page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Button asChild variant="outline">
        <Link href="/inventory">Back to inventory</Link>
      </Button>
    </div>
  );
}
