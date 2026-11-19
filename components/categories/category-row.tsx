"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/categories/category-form";
import { deleteCategory, updateCategory } from "@/app/(app)/categories/actions";

type Category = { id: string; name: string; description: string | null; itemCount: number };

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li className="py-4">
        <CategoryForm
          action={updateCategory.bind(null, category.id)}
          initial={{ name: category.name, description: category.description ?? "" }}
          submitLabel="Save"
          idPrefix={`edit-${category.id}`}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const inUse = category.itemCount > 0;

  const onDelete = () => {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) setError(result.message ?? "Could not delete the category.");
    });
  };

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{category.name}</p>
        <p className="text-sm text-muted-foreground">
          {category.description ? `${category.description} · ` : ""}
          {category.itemCount} item{category.itemCount === 1 ? "" : "s"}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={pending}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={pending || inUse}
          title={inUse ? "Categories that are used by items can't be deleted" : undefined}
        >
          <Trash2 className="h-3.5 w-3.5" /> {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </li>
  );
}
