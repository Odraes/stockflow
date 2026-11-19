-- =============================================================================
-- StockPilot · Migration 4: stock operation functions (RPC)
--
-- The ONLY way to change stock. Each public function:
--   1. identifies the caller from their login token (auth.uid()) and checks
--      their role in the database — never trusting the browser;
--   2. validates input;
--   3. locks the item row (SELECT ... FOR UPDATE) so concurrent operations on
--      the same item queue up instead of racing;
--   4. updates batches (FEFO), the item total, and writes movement rows —
--      all inside one transaction: everything succeeds or nothing does.
--
-- Error codes (the app maps these to friendly messages):
--   42501 permission denied   P0002 not found
--   22023 invalid input       SP001 insufficient stock
--
-- Note: "expired" compares against current_date in the database time zone
-- (UTC). A café time-zone setting can refine this later.
-- =============================================================================

-- Internal helpers live in a schema the API does not expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- private helpers
-- ---------------------------------------------------------------------------
create function private.require_role(p_allowed public.app_role[], p_action text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not public.has_role(p_allowed) then
    raise exception 'Your role is not allowed to %', p_action using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create function private.validate_quantity(p_quantity numeric, p_allow_zero boolean default false)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_quantity is null then
    raise exception 'Quantity is required' using errcode = '22023';
  end if;
  if p_quantity < 0 or (p_quantity = 0 and not p_allow_zero) then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;
  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Quantity can have at most 3 decimal places' using errcode = '22023';
  end if;
  if p_quantity >= 100000000000 then
    raise exception 'Quantity is too large' using errcode = '22023';
  end if;
end;
$$;

create function private.resolve_occurred_at(p_occurred_at timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  -- Small allowance for clock differences between browser and database.
  if p_occurred_at > now() + interval '5 minutes' then
    raise exception 'Transaction date cannot be in the future' using errcode = '22023';
  end if;
  return coalesce(p_occurred_at, now());
end;
$$;

create function private.clean_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(p_text), '');
$$;

-- Lock the item row and verify the caller's unit matches the item's unit.
create function private.lock_item(p_item_id uuid, p_unit public.stock_unit)
returns public.items
language plpgsql
set search_path = ''
as $$
declare
  v_item public.items;
begin
  select * into v_item from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;
  if p_unit is null or p_unit <> v_item.unit then
    raise exception 'Unit mismatch: "%" is tracked in %, but % was submitted',
      v_item.name, v_item.unit, coalesce(p_unit::text, 'no unit')
      using errcode = '22023';
  end if;
  return v_item;
end;
$$;

-- ---------------------------------------------------------------------------
-- private.consume_fefo: remove stock from batches, First Expired First Out.
--
-- Order: earliest expiration first; batches without an expiry date last;
-- ties broken by oldest received. One movement row per batch touched.
-- The caller must already hold the lock on the item row.
-- ---------------------------------------------------------------------------
create function private.consume_fefo(
  p_item            public.items,
  p_type            public.movement_type,
  p_quantity        numeric,
  p_user_id         uuid,
  p_reason          text,
  p_note            text,
  p_occurred_at     timestamptz,
  p_batch_id        uuid,
  p_include_expired boolean
)
returns setof public.stock_movements
language plpgsql
set search_path = ''
as $$
declare
  v_operation_id uuid := gen_random_uuid();
  v_available    numeric;
  v_expired      numeric;
  v_remaining    numeric := p_quantity;
  v_current      numeric := p_item.quantity;
  v_take         numeric;
  v_batch        public.stock_batches;
  v_movement     public.stock_movements;
begin
  if p_batch_id is not null
     and not exists (select 1 from public.stock_batches b
                     where b.id = p_batch_id and b.item_id = p_item.id) then
    raise exception 'Batch not found for this item' using errcode = 'P0002';
  end if;

  -- Lock every eligible batch, then total what is available.
  select coalesce(sum(s.remaining_quantity), 0) into v_available
  from (
    select b.remaining_quantity
    from public.stock_batches b
    where b.item_id = p_item.id
      and b.remaining_quantity > 0
      and (p_batch_id is null or b.id = p_batch_id)
      and (p_include_expired or b.expiration_date is null or b.expiration_date >= current_date)
    for update
  ) s;

  if v_available < p_quantity then
    if not p_include_expired then
      select coalesce(sum(b.remaining_quantity), 0) into v_expired
      from public.stock_batches b
      where b.item_id = p_item.id and b.remaining_quantity > 0
        and b.expiration_date < current_date
        and (p_batch_id is null or b.id = p_batch_id);
    end if;

    -- (RAISE options may not be NULL, so the hint variant is a separate branch.)
    if coalesce(v_expired, 0) > 0 then
      raise exception 'Insufficient stock for "%": requested % %, available % %',
        p_item.name, p_quantity, p_item.unit, v_available, p_item.unit
        using errcode = 'SP001',
              hint = format('%s %s is expired and cannot be used; record it as wastage.',
                            v_expired, p_item.unit);
    end if;
    raise exception 'Insufficient stock for "%": requested % %, available % %',
      p_item.name, p_quantity, p_item.unit, v_available, p_item.unit
      using errcode = 'SP001';
  end if;

  for v_batch in
    select b.*
    from public.stock_batches b
    where b.item_id = p_item.id
      and b.remaining_quantity > 0
      and (p_batch_id is null or b.id = p_batch_id)
      and (p_include_expired or b.expiration_date is null or b.expiration_date >= current_date)
    order by b.expiration_date asc nulls last, b.received_at asc, b.id
  loop
    exit when v_remaining <= 0;
    v_take := least(v_batch.remaining_quantity, v_remaining);

    update public.stock_batches
       set remaining_quantity = remaining_quantity - v_take
     where id = v_batch.id;

    insert into public.stock_movements (
      operation_id, item_id, batch_id, user_id, type,
      quantity_change, previous_quantity, resulting_quantity,
      reason, note, occurred_at
    ) values (
      v_operation_id, p_item.id, v_batch.id, p_user_id, p_type,
      -v_take, v_current, v_current - v_take,
      p_reason, p_note, p_occurred_at
    )
    returning * into v_movement;

    return next v_movement;

    v_current   := v_current - v_take;
    v_remaining := v_remaining - v_take;
  end loop;

  update public.items set quantity = v_current where id = p_item.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- private.add_batch: create a batch, raise the item total, log the movement.
-- The caller must already hold the lock on the item row.
-- ---------------------------------------------------------------------------
create function private.add_batch(
  p_item            public.items,
  p_type            public.movement_type,
  p_quantity        numeric,
  p_user_id         uuid,
  p_supplier_id     uuid,
  p_unit_cost       numeric,
  p_batch_number    text,
  p_expiration_date date,
  p_reason          text,
  p_note            text,
  p_occurred_at     timestamptz
)
returns public.stock_movements
language plpgsql
set search_path = ''
as $$
declare
  v_batch    public.stock_batches;
  v_movement public.stock_movements;
begin
  insert into public.stock_batches (
    item_id, supplier_id, batch_number, received_quantity, remaining_quantity,
    unit_cost, expiration_date, received_at, created_by
  ) values (
    p_item.id, p_supplier_id, p_batch_number, p_quantity, p_quantity,
    p_unit_cost, p_expiration_date, p_occurred_at, p_user_id
  )
  returning * into v_batch;

  update public.items set quantity = quantity + p_quantity where id = p_item.id;

  insert into public.stock_movements (
    operation_id, item_id, batch_id, supplier_id, user_id, type,
    quantity_change, previous_quantity, resulting_quantity,
    reason, note, occurred_at
  ) values (
    gen_random_uuid(), p_item.id, v_batch.id, p_supplier_id, p_user_id, p_type,
    p_quantity, p_item.quantity, p_item.quantity + p_quantity,
    p_reason, p_note, p_occurred_at
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- =============================================================================
-- Public API (called from the app with supabase.rpc(...))
-- =============================================================================

-- ---------------------------------------------------------------------------
-- receive_stock — admins and managers. Creates one batch.
-- Give EITHER p_unit_cost OR p_total_cost (or neither).
-- ---------------------------------------------------------------------------
create function public.receive_stock(
  p_item_id         uuid,
  p_quantity        numeric,
  p_unit            public.stock_unit,
  p_supplier_id     uuid        default null,
  p_unit_cost       numeric     default null,
  p_total_cost      numeric     default null,
  p_batch_number    text        default null,
  p_expiration_date date        default null,
  p_note            text        default null,
  p_received_at     timestamptz default null
)
returns setof public.stock_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid;
  v_item      public.items;
  v_at        timestamptz;
  v_unit_cost numeric;
begin
  v_uid := private.require_role(array['admin', 'manager']::public.app_role[], 'receive stock');
  perform private.validate_quantity(p_quantity);
  v_at := private.resolve_occurred_at(p_received_at);

  if p_unit_cost is not null and p_total_cost is not null then
    raise exception 'Provide either a unit cost or a total cost, not both' using errcode = '22023';
  end if;
  if p_unit_cost < 0 or p_total_cost < 0 then
    raise exception 'Costs cannot be negative' using errcode = '22023';
  end if;
  v_unit_cost := coalesce(p_unit_cost, round(p_total_cost / p_quantity, 4));

  v_item := private.lock_item(p_item_id, p_unit);
  if not v_item.is_active then
    raise exception 'Cannot receive stock for archived item "%"', v_item.name using errcode = '22023';
  end if;

  if p_supplier_id is not null
     and not exists (select 1 from public.suppliers s where s.id = p_supplier_id and s.is_active) then
    raise exception 'Supplier not found or archived' using errcode = 'P0002';
  end if;

  if p_expiration_date is not null and p_expiration_date < (v_at at time zone 'UTC')::date then
    raise exception 'Expiration date is before the received date' using errcode = '22023';
  end if;

  return next private.add_batch(
    v_item, 'receive', p_quantity, v_uid, p_supplier_id, v_unit_cost,
    private.clean_text(p_batch_number), p_expiration_date,
    null, private.clean_text(p_note), v_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- record_usage — every role. FEFO, skips expired batches.
-- ---------------------------------------------------------------------------
create function public.record_usage(
  p_item_id     uuid,
  p_quantity    numeric,
  p_unit        public.stock_unit,
  p_reason      text        default null,
  p_note        text        default null,
  p_occurred_at timestamptz default null
)
returns setof public.stock_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid;
  v_item public.items;
  v_at   timestamptz;
begin
  v_uid := private.require_role(array['admin', 'manager', 'staff']::public.app_role[], 'record usage');
  perform private.validate_quantity(p_quantity);
  v_at := private.resolve_occurred_at(p_occurred_at);

  v_item := private.lock_item(p_item_id, p_unit);
  if not v_item.is_active then
    raise exception 'Cannot record usage for archived item "%"', v_item.name using errcode = '22023';
  end if;

  return query
    select * from private.consume_fefo(
      v_item, 'usage', p_quantity, v_uid,
      private.clean_text(p_reason), private.clean_text(p_note), v_at,
      null, false
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- record_wastage — every role. Reason required. Includes expired batches
-- (that is usually WHY it is wasted). Optionally target one specific batch.
-- Allowed on archived items so leftover stock can be written off.
-- ---------------------------------------------------------------------------
create function public.record_wastage(
  p_item_id     uuid,
  p_quantity    numeric,
  p_unit        public.stock_unit,
  p_reason      text,
  p_note        text        default null,
  p_batch_id    uuid        default null,
  p_occurred_at timestamptz default null
)
returns setof public.stock_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid;
  v_item public.items;
  v_at   timestamptz;
begin
  v_uid := private.require_role(array['admin', 'manager', 'staff']::public.app_role[], 'record wastage');
  perform private.validate_quantity(p_quantity);
  v_at := private.resolve_occurred_at(p_occurred_at);

  if private.clean_text(p_reason) is null then
    raise exception 'A reason is required for wastage' using errcode = '22023';
  end if;

  v_item := private.lock_item(p_item_id, p_unit);

  return query
    select * from private.consume_fefo(
      v_item, 'wastage', p_quantity, v_uid,
      private.clean_text(p_reason), private.clean_text(p_note), v_at,
      p_batch_id, true
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- adjust_stock — admins and managers. Sets the item to a counted quantity.
--   counted > current: the difference becomes a new batch (optional expiry)
--   counted < current: the difference is removed FEFO (expired included)
-- ---------------------------------------------------------------------------
create function public.adjust_stock(
  p_item_id         uuid,
  p_new_quantity    numeric,
  p_unit            public.stock_unit,
  p_reason          text,
  p_note            text default null,
  p_expiration_date date default null
)
returns setof public.stock_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid;
  v_item  public.items;
  v_delta numeric;
begin
  v_uid := private.require_role(array['admin', 'manager']::public.app_role[], 'adjust stock');
  perform private.validate_quantity(p_new_quantity, true);

  if private.clean_text(p_reason) is null then
    raise exception 'A reason is required for adjustments' using errcode = '22023';
  end if;

  v_item  := private.lock_item(p_item_id, p_unit);
  v_delta := p_new_quantity - v_item.quantity;

  if v_delta = 0 then
    raise exception '"%" is already at % %; nothing to adjust', v_item.name, v_item.quantity, v_item.unit
      using errcode = '22023';
  end if;

  if v_delta > 0 then
    return next private.add_batch(
      v_item, 'adjustment', v_delta, v_uid, null, null, null, p_expiration_date,
      private.clean_text(p_reason), private.clean_text(p_note), now()
    );
  else
    return query
      select * from private.consume_fefo(
        v_item, 'adjustment', -v_delta, v_uid,
        private.clean_text(p_reason), private.clean_text(p_note), now(),
        null, true
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: logged-in users only. Role checks happen inside each function.
-- ---------------------------------------------------------------------------
revoke execute on function public.receive_stock(uuid, numeric, public.stock_unit, uuid, numeric, numeric, text, date, text, timestamptz) from public, anon;
revoke execute on function public.record_usage(uuid, numeric, public.stock_unit, text, text, timestamptz)                              from public, anon;
revoke execute on function public.record_wastage(uuid, numeric, public.stock_unit, text, text, uuid, timestamptz)                     from public, anon;
revoke execute on function public.adjust_stock(uuid, numeric, public.stock_unit, text, text, date)                                     from public, anon;

grant execute on function public.receive_stock(uuid, numeric, public.stock_unit, uuid, numeric, numeric, text, date, text, timestamptz) to authenticated;
grant execute on function public.record_usage(uuid, numeric, public.stock_unit, text, text, timestamptz)                              to authenticated;
grant execute on function public.record_wastage(uuid, numeric, public.stock_unit, text, text, uuid, timestamptz)                     to authenticated;
grant execute on function public.adjust_stock(uuid, numeric, public.stock_unit, text, text, date)                                     to authenticated;

-- Trigger-only functions should never be callable directly.
revoke execute on function public.set_updated_at()               from public, anon, authenticated;
revoke execute on function public.items_before_write()           from public, anon, authenticated;
revoke execute on function public.prevent_movement_changes()     from public, anon, authenticated;
revoke execute on function public.protect_batch_columns()        from public, anon, authenticated;
revoke execute on function public.check_item_batch_consistency() from public, anon, authenticated;
