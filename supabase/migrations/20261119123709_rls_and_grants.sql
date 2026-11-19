-- =============================================================================
-- StockPilot · Migration 3: Row Level Security and privileges
--
-- Two layers work together:
--   1. GRANTs   — which tables/COLUMNS a role may touch at all.
--   2. RLS      — which ROWS, and under which conditions.
--
-- `anon` (not logged in) gets nothing. `authenticated` may read everything
-- (it is one shared café inventory) but may only write what its role allows.
-- Stock quantities, batches and movements have NO write grants at all: the
-- only way to change them is through the stock functions in migration 4.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Turn on RLS. With RLS on and no matching policy, access is denied.
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.suppliers       enable row level security;
alter table public.items           enable row level security;
alter table public.stock_batches   enable row level security;
alter table public.stock_movements enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges: start from zero, then grant the minimum.
-- ---------------------------------------------------------------------------
revoke all on table
  public.profiles, public.categories, public.suppliers,
  public.items, public.stock_batches, public.stock_movements
from anon, authenticated;

grant select on table
  public.profiles, public.categories, public.suppliers,
  public.items, public.stock_batches, public.stock_movements
to authenticated;

-- profiles: users may only edit their display name. `role` is not grantable;
-- it changes only through set_user_role() / bootstrap_admin().
grant update (full_name) on public.profiles to authenticated;

grant insert, update, delete on public.categories to authenticated;

-- suppliers: no DELETE (archive with is_active = false instead).
grant insert (name, contact_person, phone, email, address, notes, is_active),
      update (name, contact_person, phone, email, address, notes, is_active)
  on public.suppliers to authenticated;

-- items: no DELETE (archive), and `quantity` is deliberately missing from
-- both lists, so nobody can "silently edit" stock through the API.
grant insert (name, sku, description, category_id, supplier_id, min_stock, unit, location, is_active),
      update (name, sku, description, category_id, supplier_id, min_stock, unit, location, is_active)
  on public.items to authenticated;

-- stock_batches / stock_movements: SELECT only (granted above).

-- Future tables/functions in `public` should not be open to anon by default.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Policies. `(select ...)` wrappers let Postgres evaluate the role check once
-- per query instead of once per row.
-- ---------------------------------------------------------------------------

-- profiles ------------------------------------------------------------------
create policy "Authenticated users can view profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users update own profile; admins update any"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.has_role(array['admin']::public.app_role[]))
  )
  with check (
    id = (select auth.uid())
    or (select public.has_role(array['admin']::public.app_role[]))
  );

-- categories ----------------------------------------------------------------
create policy "Authenticated users can view categories"
  on public.categories for select to authenticated
  using (true);

create policy "Admins and managers can create categories"
  on public.categories for insert to authenticated
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy "Admins and managers can update categories"
  on public.categories for update to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])))
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

-- Deleting a category that items still use is blocked by the foreign key
-- (ON DELETE RESTRICT), regardless of role.
create policy "Admins and managers can delete categories"
  on public.categories for delete to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])));

-- suppliers -----------------------------------------------------------------
create policy "Authenticated users can view suppliers"
  on public.suppliers for select to authenticated
  using (true);

create policy "Admins and managers can create suppliers"
  on public.suppliers for insert to authenticated
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy "Admins and managers can update suppliers"
  on public.suppliers for update to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])))
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

-- items ---------------------------------------------------------------------
create policy "Authenticated users can view items"
  on public.items for select to authenticated
  using (true);

create policy "Admins and managers can create items"
  on public.items for insert to authenticated
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy "Admins and managers can update items"
  on public.items for update to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])))
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

-- stock_batches / stock_movements: read-only from the API -------------------
create policy "Authenticated users can view stock batches"
  on public.stock_batches for select to authenticated
  using (true);

create policy "Authenticated users can view stock movements"
  on public.stock_movements for select to authenticated
  using (true);
