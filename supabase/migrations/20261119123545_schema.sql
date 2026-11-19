-- =============================================================================
-- StockPilot · Migration 1: core schema
--
-- Creates the enums, six tables, constraints, indexes and housekeeping
-- triggers. Security (RLS, grants) and stock functions come in later
-- migrations so each file has one clear job.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums: a fixed list of allowed values, enforced by the database itself.
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'manager', 'staff');

create type public.movement_type as enum ('receive', 'usage', 'wastage', 'adjustment');

-- Base units only. Quantities are always stored in the item's base unit
-- (e.g. 1.5 L of milk is stored as 1500 ml). Conversions are a UI concern.
create type public.stock_unit as enum ('g', 'ml', 'pcs');

-- ---------------------------------------------------------------------------
-- Generic trigger: keep updated_at current on every UPDATE.
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (created automatically in migration 2).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  role        public.app_role not null default 'staff',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  created_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness: "Dairy" and "dairy" count as duplicates.
create unique index categories_name_unique on public.categories (lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 1 and 120),
  contact_person text check (contact_person is null or char_length(contact_person) <= 120),
  phone          text check (phone is null or char_length(phone) <= 40),
  email          text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address        text check (address is null or char_length(address) <= 500),
  notes          text check (notes is null or char_length(notes) <= 2000),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index suppliers_is_active_idx on public.suppliers (is_active);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- items
--
-- numeric(14,3): exact decimal (no floating-point rounding errors), up to
-- 99,999,999,999.999 with 3 decimals — enough for 25.5 g or 0.125 pcs.
-- ---------------------------------------------------------------------------
create table public.items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  sku         text not null unique
              check (sku ~ '^[A-Z0-9][A-Z0-9._-]{0,63}$'),
  description text check (description is null or char_length(description) <= 1000),
  category_id uuid not null references public.categories (id) on delete restrict,
  supplier_id uuid references public.suppliers (id) on delete restrict,
  quantity    numeric(14, 3) not null default 0 check (quantity >= 0),
  min_stock   numeric(14, 3) not null default 0 check (min_stock >= 0),
  unit        public.stock_unit not null,
  location    text check (location is null or char_length(location) <= 120),
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index items_category_id_idx on public.items (category_id);
create index items_supplier_id_idx on public.items (supplier_id);
create index items_created_by_idx  on public.items (created_by);
create index items_is_active_idx   on public.items (is_active);
create index items_name_idx        on public.items (lower(name));

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- Normalise SKUs ("  esp-01 " -> "ESP-01") so uniqueness is case-insensitive,
-- and stamp created_by with the real logged-in user (never trust the client).
create function public.items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sku := upper(btrim(new.sku));
  new.name := btrim(new.name);

  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;   -- immutable after creation
    new.created_at := old.created_at;

    -- Changing the unit after stock history exists would silently turn
    -- "500 g" into "500 ml". Block it.
    if new.unit is distinct from old.unit
       and exists (select 1 from public.stock_movements m where m.item_id = old.id) then
      raise exception 'Cannot change the unit of an item that already has stock history'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- stock_batches: every received lot. remaining_quantity is consumed FEFO.
-- ---------------------------------------------------------------------------
create table public.stock_batches (
  id                 uuid primary key default gen_random_uuid(),
  item_id            uuid not null references public.items (id) on delete restrict,
  supplier_id        uuid references public.suppliers (id) on delete restrict,
  batch_number       text check (batch_number is null or char_length(batch_number) <= 80),
  received_quantity  numeric(14, 3) not null check (received_quantity > 0),
  remaining_quantity numeric(14, 3) not null
                     check (remaining_quantity >= 0 and remaining_quantity <= received_quantity),
  unit_cost          numeric(14, 4) check (unit_cost is null or unit_cost >= 0),
  expiration_date    date,
  received_at        timestamptz not null default now(),
  created_by         uuid not null references public.profiles (id) on delete restrict,
  created_at         timestamptz not null default now()
);

create index stock_batches_item_id_idx     on public.stock_batches (item_id);
create index stock_batches_supplier_id_idx on public.stock_batches (supplier_id);
create index stock_batches_created_by_idx  on public.stock_batches (created_by);
-- FEFO lookups and "expiring soon" reports only care about batches with stock left.
create index stock_batches_fefo_idx
  on public.stock_batches (item_id, expiration_date nulls last, received_at)
  where remaining_quantity > 0;
create index stock_batches_expiring_idx
  on public.stock_batches (expiration_date)
  where remaining_quantity > 0 and expiration_date is not null;

-- ---------------------------------------------------------------------------
-- stock_movements: the append-only audit log.
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id                 uuid primary key default gen_random_uuid(),
  -- Groups the rows written by one operation (a usage spanning 2 batches = 2 rows).
  operation_id       uuid not null,
  item_id            uuid not null references public.items (id) on delete restrict,
  batch_id           uuid references public.stock_batches (id) on delete restrict,
  supplier_id        uuid references public.suppliers (id) on delete restrict,
  user_id            uuid not null references public.profiles (id) on delete restrict,
  type               public.movement_type not null,
  quantity_change    numeric(14, 3) not null check (quantity_change <> 0),
  previous_quantity  numeric(14, 3) not null check (previous_quantity >= 0),
  resulting_quantity numeric(14, 3) not null check (resulting_quantity >= 0),
  reason             text check (reason is null or char_length(reason) <= 200),
  note               text check (note is null or char_length(note) <= 1000),
  occurred_at        timestamptz not null default now(),  -- business date (may be backdated)
  created_at         timestamptz not null default now(),  -- when it was recorded (audit)

  constraint stock_movements_math_check
    check (resulting_quantity = previous_quantity + quantity_change),
  constraint stock_movements_sign_check
    check (
      (type = 'receive' and quantity_change > 0)
      or (type in ('usage', 'wastage') and quantity_change < 0)
      or type = 'adjustment'
    ),
  constraint stock_movements_reason_required
    check (type not in ('wastage', 'adjustment') or nullif(btrim(reason), '') is not null)
);

create index stock_movements_item_created_idx on public.stock_movements (item_id, created_at desc);
create index stock_movements_created_idx      on public.stock_movements (created_at desc);
create index stock_movements_type_occurred_idx on public.stock_movements (type, occurred_at desc);
create index stock_movements_user_id_idx      on public.stock_movements (user_id);
create index stock_movements_supplier_id_idx  on public.stock_movements (supplier_id);
create index stock_movements_batch_id_idx     on public.stock_movements (batch_id);
create index stock_movements_operation_id_idx on public.stock_movements (operation_id);

-- items_before_write references stock_movements, so attach it now.
create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

-- ---------------------------------------------------------------------------
-- Audit protection: history can never be edited or deleted — not even by a
-- database administrator through the API.
-- ---------------------------------------------------------------------------
create function public.prevent_movement_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Stock movements are immutable; record a new adjustment instead'
    using errcode = '42501';
end;
$$;

create trigger stock_movements_immutable
  before update or delete on public.stock_movements
  for each row execute function public.prevent_movement_changes();

create trigger stock_movements_no_truncate
  before truncate on public.stock_movements
  for each statement execute function public.prevent_movement_changes();

-- Batches: only remaining_quantity may ever change, and they are never deleted.
create function public.protect_batch_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Stock batches cannot be deleted' using errcode = '42501';
  end if;

  if new.item_id           is distinct from old.item_id
     or new.received_quantity is distinct from old.received_quantity
     or new.supplier_id    is distinct from old.supplier_id
     or new.unit_cost      is distinct from old.unit_cost
     or new.expiration_date is distinct from old.expiration_date
     or new.received_at    is distinct from old.received_at
     or new.created_by     is distinct from old.created_by
     or new.created_at     is distinct from old.created_at then
    raise exception 'Only remaining_quantity of a stock batch can change' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger stock_batches_protect
  before update or delete on public.stock_batches
  for each row execute function public.protect_batch_columns();

-- ---------------------------------------------------------------------------
-- Consistency guard: at COMMIT time, every touched item's quantity must equal
-- the sum of its batches' remaining quantities. "deferrable initially
-- deferred" means the check waits until the whole transaction is done, so
-- functions can update batch and item in any order.
-- ---------------------------------------------------------------------------
create function public.check_item_batch_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item_id  uuid := new.item_id;
  v_item_qty numeric;
  v_batch_qty numeric;
begin
  if tg_table_name = 'items' then
    v_item_id := new.id;
  end if;

  select i.quantity into v_item_qty from public.items i where i.id = v_item_id;
  select coalesce(sum(b.remaining_quantity), 0) into v_batch_qty
    from public.stock_batches b where b.item_id = v_item_id;

  if v_item_qty is distinct from v_batch_qty then
    raise exception 'Inventory inconsistency for item %: item quantity % <> batch total %',
      v_item_id, v_item_qty, v_batch_qty
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger items_quantity_consistent
  after insert or update of quantity on public.items
  deferrable initially deferred
  for each row execute function public.check_item_batch_consistency();

create constraint trigger stock_batches_quantity_consistent
  after insert or update of remaining_quantity on public.stock_batches
  deferrable initially deferred
  for each row execute function public.check_item_batch_consistency();
