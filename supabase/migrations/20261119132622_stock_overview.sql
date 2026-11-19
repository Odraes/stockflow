-- =============================================================================
-- StockPilot · Migration 7: item stock overview (dashboard, inventory, alerts)
-- =============================================================================

-- How many days ahead counts as "near expiration". A function (not a magic
-- number in several places) so a future Settings page can make it editable.
create function public.near_expiry_days()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 3;
$$;

-- ---------------------------------------------------------------------------
-- item_stock_overview: one row per item with computed alert information.
--
-- security_invoker = true is ESSENTIAL: by default a view runs with its
-- owner's rights and would bypass RLS. With security_invoker, the caller's
-- own RLS rules apply (so pending/disabled users still see nothing).
-- ---------------------------------------------------------------------------
create view public.item_stock_overview
with (security_invoker = true)
as
select
  i.id,
  i.name,
  i.sku,
  i.unit,
  i.quantity,
  i.min_stock,
  i.location,
  i.is_active,
  i.category_id,
  c.name  as category_name,
  i.supplier_id,
  s.name  as supplier_name,
  case
    when i.quantity = 0 then 'out_of_stock'
    when i.quantity <= i.min_stock then 'low_stock'
    else 'in_stock'
  end as stock_status,
  coalesce(b.expired_quantity, 0)  as expired_quantity,
  coalesce(b.expiring_quantity, 0) as expiring_quantity,
  b.next_expiration_date,
  i.created_at,
  i.updated_at
from public.items i
join public.categories c on c.id = i.category_id
left join public.suppliers s on s.id = i.supplier_id
left join lateral (
  select
    sum(sb.remaining_quantity) filter (where sb.expiration_date < current_date) as expired_quantity,
    sum(sb.remaining_quantity) filter (
      where sb.expiration_date >= current_date
        and sb.expiration_date <= current_date + public.near_expiry_days()
    ) as expiring_quantity,
    min(sb.expiration_date) filter (where sb.expiration_date >= current_date) as next_expiration_date
  from public.stock_batches sb
  where sb.item_id = i.id and sb.remaining_quantity > 0
) b on true;

revoke all on public.item_stock_overview from anon, authenticated;
grant select on public.item_stock_overview to authenticated;

revoke execute on function public.near_expiry_days() from public, anon;
grant execute on function public.near_expiry_days() to authenticated;
