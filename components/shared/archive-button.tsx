"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/db-errors";

type Props = {
  /** Server Action with the record id already bound, e.g. setItemArchived.bind(null, id). */
  action: (archived: boolean) => Promise<ActionResult>;
  name: string;
  archived: boolean;
  /** Explains what archiving means for this kind of record. */
  archiveHint: string;
};

/** Archive / restore with a confirmation prompt. Used for items and suppliers. */
export function ArchiveButton({ action, name, archived, archiveHint }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const onClick = () => {
    const message = archived ? `Restore "${name}"?` : `Archive "${name}"? ${archiveHint}`;
    if (!window.confirm(message)) return;
    startTransition(async () => setResult(await action(!archived)));
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
