-- =============================================================================
-- StockPilot · Migration 2: profiles, roles and role management
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fix-forward for migration 1: check_item_batch_consistency() read
-- `new.item_id` in its DECLARE block, which fails when the trigger fires on
-- `items` (that table has `id`, not `item_id`). Pick the column by table.
-- ---------------------------------------------------------------------------
create or replace function public.check_item_batch_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item_id   uuid;
  v_item_qty  numeric;
  v_batch_qty numeric;
begin
  if tg_table_name = 'items' then
    v_item_id := (to_jsonb(new) ->> 'id')::uuid;
  else
    v_item_id := (to_jsonb(new) ->> 'item_id')::uuid;
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

-- ---------------------------------------------------------------------------
-- Automatically create a profile for every new auth user.
--
-- SECURITY: the role is ALWAYS 'staff' here. We read full_name from the
-- sign-up metadata, but never the role — anyone can put anything in
-- user metadata when signing up.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs as the table owner so it can insert the profile
set search_path = ''      -- prevents search_path hijacking in definer functions
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(btrim(left(new.raw_user_meta_data ->> 'full_name', 120)), ''),
    'staff'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts that existed before this migration.
insert into public.profiles (id, full_name, role)
select u.id, nullif(btrim(left(u.raw_user_meta_data ->> 'full_name', 120)), ''), 'staff'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Role helpers, used by RLS policies and stock functions.
--
-- SECURITY DEFINER lets them read profiles without triggering profiles' own
-- RLS (which would otherwise recurse). STABLE lets Postgres cache the result
-- within a single statement.
-- ---------------------------------------------------------------------------
create function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create function public.has_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = any (allowed), false);
$$;

-- ---------------------------------------------------------------------------
-- set_user_role: the ONLY way to change a role from the app.
--   * caller must be an admin
--   * nobody can change their own role (no self-promotion / self-lockout)
--   * the last remaining admin cannot be demoted
-- ---------------------------------------------------------------------------
create function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Only administrators can change user roles' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  -- Lock all admin rows so two admins can't demote each other at the same time.
  if v_profile.role = 'admin' and p_role <> 'admin' then
    perform 1 from public.profiles where role = 'admin' for update;
    if (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'Cannot demote the last administrator' using errcode = '42501';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- bootstrap_admin: promote the FIRST administrator.
--
-- Not callable from the website at all (execute revoked from anon and
-- authenticated). Run it from the Supabase dashboard SQL Editor, which only
-- project owners can reach:
--     select public.bootstrap_admin('you@example.com');
-- It refuses to run once an admin exists; after that, admins use set_user_role.
-- ---------------------------------------------------------------------------
create function public.bootstrap_admin(p_email text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An administrator already exists; use set_user_role instead'
      using errcode = '42501';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user_id is null then
    raise exception 'No user with that email. Sign up first, then run this again.'
      using errcode = 'P0002';
  end if;

  update public.profiles set role = 'admin' where id = v_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function permissions. Supabase grants EXECUTE to everyone by default, so we
-- revoke and grant explicitly.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user()                 from public, anon, authenticated;
revoke execute on function public.bootstrap_admin(text)              from public, anon, authenticated;
revoke execute on function public.current_user_role()               from public, anon;
revoke execute on function public.has_role(public.app_role[])        from public, anon;
revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;

grant execute on function public.current_user_role()                 to authenticated;
grant execute on function public.has_role(public.app_role[])          to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
