"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setItemArchived } from "@/app/(app)/inventory/actions";
import type { ActionResult } from "@/lib/db-errors";

export function ArchiveButton({ itemId, itemName, archived }: { itemId: string; itemName: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const onClick = () => {
    const message = archived
      ? `Restore "${itemName}" to the active inventory?`
      : `Archive "${itemName}"? It will be hidden from the inventory, but its stock history is kept.`;
    if (!window.confirm(message)) return;
    startTransition(async () => setResult(await setItemArchived(itemId, !archived)));
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" onClick={onClick} disabled={pending}>
        {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        {pending ? "Saving…" : archived ? "Restore" : "Archive"}
      </Button>
      {result && !result.ok && <p className="text-xs text-destructive">{result.error}</p>}
    </div>
  );
}
