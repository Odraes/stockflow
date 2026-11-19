import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Mail, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth";
import { listSuppliers } from "@/lib/data/suppliers";
import { can } from "@/lib/permissions";
import { sanitizeSearch } from "@/lib/validations/common";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Suppliers" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SuppliersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("suppliers:view");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Who you buy from, how to reach them, and what you received.</p>
        </div>
        {can(user.role, "suppliers:manage") && (
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus className="h-4 w-4" /> Add supplier
            </Link>
          </Button>
        )}
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <SupplierResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SupplierResults({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : "");
  const archived = sp.archived === "1";
  const suppliers = await listSuppliers({ q, archived });
  const href = (a: boolean) => {
    const params = new URLSearchParams({ ...(q ? { q } : {}), ...(a ? { archived: "1" } : {}) }).toString();
    return params ? `/suppliers?${params}` : "/suppliers";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b text-sm">
        {[false, true].map((a) => (
          <Link
            key={String(a)}
            href={href(a)}
            aria-current={archived === a ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2",
              archived === a ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {a ? "Archived" : "Active"}
          </Link>
        ))}
      </div>

      <Form action="/suppliers" className="flex gap-2">
        {archived && <input type="hidden" name="archived" value="1" />}
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">Search suppliers</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="q" name="q" type="search" defaultValue={q} placeholder="Search name, contact or email…" className="pl-9" maxLength={80} />
        </div>
        <Button type="submit">Search</Button>
      </Form>

      {suppliers.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-medium">{q ? "No suppliers match your search" : archived ? "No archived suppliers" : "No suppliers yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q ? "Try a different search." : archived ? "Archived suppliers will appear here." : "Add the companies you buy coffee, dairy, bakery goods and packaging from."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link href={`/suppliers/${s.id}`} className="block h-full rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <p className="font-medium">{s.name}</p>
                {s.contactPerson && <p className="text-sm text-muted-foreground">{s.contactPerson}</p>}
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {s.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" aria-hidden />{s.phone}</p>}
                  {s.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />{s.email}</p>}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Preferred supplier for {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
