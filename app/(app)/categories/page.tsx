import type { Metadata } from "next";
import { CategoryForm } from "@/components/categories/category-form";
import { CategoryRow } from "@/components/categories/category-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCategory } from "@/app/(app)/categories/actions";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePermission("categories:manage");

  const supabase = await createClient();
  // items(count) asks PostgREST to count related items (active + archived)
  // instead of downloading them.
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, items(count)")
    .order("name");

  if (error) throw new Error("Could not load categories.");

  const categories = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    itemCount: c.items[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Group your inventory. A category can only be deleted when no items (including archived ones) use it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm action={createCategory} submitLabel="Add category" idPrefix="new-category" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All categories</CardTitle>
          <CardDescription>{categories.length} categories</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No categories yet. Add one above.
            </p>
          ) : (
            <ul className="divide-y">
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
