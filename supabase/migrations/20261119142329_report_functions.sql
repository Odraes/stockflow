-- =============================================================================
-- StockPilot · Migration 9: report functions
--
-- Aggregations run in the database (one GROUP BY instead of downloading every
-- movement). All functions are SECURITY INVOKER: they run with the caller's
-- own rights, so RLS still decides what they can see (pending or disabled
-- users get empty results).
--
-- Quantities are never summed across units: every result row has one unit.
-- =============================================================================

-- Per item: received / used / wasted / adjusted and purchase cost in a period.
create function public.report_movement_summary(
  p_from        timestamptz,
  p_to          timestamptz,
  p_category_id uuid default null
)
returns table (
  item_id           uuid,
  item_name         text,
  sku               text,
  unit              public.stock_unit,
  category_name     text,
  received          numeric,
  used              numeric,
  wasted            numeric,
  adjusted          numeric,
  net_change        numeric,
  purchase_cost     numeric,
  uncosted_receipts bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    i.id,
    i.name,
    i.sku,
    i.unit,
    c.name,
    coalesce(sum(m.quantity_change) filter (where m.type = 'receive'), 0),
    coalesce(-sum(m.quantity_change) filter (where m.type = 'usage'), 0),
    coalesce(-sum(m.quantity_change) filter (where m.type = 'wastage'), 0),
    coalesce(sum(m.quantity_change) filter (where m.type = 'adjustment'), 0),
    coalesce(sum(m.quantity_change), 0),
    round(sum(m.quantity_change * b.unit_cost) filter (where m.type = 'receive' and b.unit_cost is not null), 2),
    count(*) filter (where m.type = 'receive' and b.unit_cost is null)
  from public.stock_movements m
  join public.items i on i.id = m.item_id
  join public.categories c on c.id = i.category_id
  left join public.stock_batches b on b.id = m.batch_id
  where m.occurred_at >= p_from
    and m.occurred_at < p_to
    and (p_category_id is null or i.category_id = p_category_id)
  group by i.id, i.name, i.sku, i.unit, c.name
  order by i.name;
$$;

-- Wastage grouped by reason AND unit (never mixing ml with pcs).
create function public.report_wastage_by_reason(
  p_from        timestamptz,
  p_to          timestamptz,
  p_category_id uuid default null
)
returns table (
  reason   text,
  unit     public.stock_unit,
  quantity numeric,
  events   bigint,
  items    bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(m.reason, '(no reason)'),
    i.unit,
    -sum(m.quantity_change),
    count(distinct m.operation_id),
    count(distinct m.item_id)
  from public.stock_movements m
  join public.items i on i.id = m.item_id
  where m.type = 'wastage'
    and m.occurred_at >= p_from
    and m.occurred_at < p_to
    and (p_category_id is null or i.category_id = p_category_id)
  group by 1, 2
  order by 2, 3 desc;
$$;

-- Deliveries per supplier (receipts without a supplier are grouped together).
create function public.report_supplier_purchases(
  p_from timestamptz,
  p_to   timestamptz
)
returns table (
  supplier_id         uuid,
  supplier_name       text,
  deliveries          bigint,
  distinct_items      bigint,
  total_cost          numeric,
  uncosted_deliveries bigint,
  last_delivery       timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    coalesce(s.name, '(no supplier recorded)'),
    count(*),
    count(distinct m.item_id),
    round(sum(m.quantity_change * b.unit_cost) filter (where b.unit_cost is not null), 2),
    count(*) filter (where b.unit_cost is null),
    max(m.occurred_at)
  from public.stock_movements m
  left join public.stock_batches b on b.id = m.batch_id
  left join public.suppliers s on s.id = m.supplier_id
  where m.type = 'receive'
    and m.occurred_at >= p_from
    and m.occurred_at < p_to
  group by s.id, s.name
  order by 5 desc nulls last, 2;
$$;

revoke execute on function public.report_movement_summary(timestamptz, timestamptz, uuid) from public, anon;
revoke execute on function public.report_wastage_by_reason(timestamptz, timestamptz, uuid) from public, anon;
revoke execute on function public.report_supplier_purchases(timestamptz, timestamptz)      from public, anon;
grant  execute on function public.report_movement_summary(timestamptz, timestamptz, uuid) to authenticated;
grant  execute on function public.report_wastage_by_reason(timestamptz, timestamptz, uuid) to authenticated;
grant  execute on function public.report_supplier_purchases(timestamptz, timestamptz)      to authenticated;
