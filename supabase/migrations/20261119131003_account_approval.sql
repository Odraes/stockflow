-- =============================================================================
-- StockPilot · Migration 6: account approval (pending / active / disabled)
--
-- Sign-ups stay open, but a new account can do NOTHING until an admin
-- approves it. Disabling replaces deleting: users referenced by stock history
-- can't be deleted, but they can be locked out.
-- =============================================================================

create type public.account_status as enum ('pending', 'active', 'disabled');

alter table public.profiles
  add column status public.account_status not null default 'pending';

create index profiles_status_idx on public.profiles (status);

-- Existing accounts also start as pending; bootstrap_admin() activates the
-- first administrator, who then approves everyone else.

-- ---------------------------------------------------------------------------
-- Role helpers now only recognise ACTIVE accounts. Because every RLS write
-- policy and every stock function goes through has_role(), pending and
-- disabled users automatically lose all write access.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.status = 'active';
$$;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() is not null;
$$;

revoke execute on function public.is_active_user() from public, anon;
grant  execute on function public.is_active_user() to authenticated;

-- ---------------------------------------------------------------------------
-- Read access: only active users. Pending users may still read their OWN
-- profile so the app can show "waiting for approval".
-- ---------------------------------------------------------------------------
drop policy "Authenticated users can view profiles"        on public.profiles;
drop policy "Authenticated users can view categories"      on public.categories;
drop policy "Authenticated users can view suppliers"       on public.suppliers;
drop policy "Authenticated users can view items"           on public.items;
drop policy "Authenticated users can view stock batches"   on public.stock_batches;
drop policy "Authenticated users can view stock movements" on public.stock_movements;

create policy "Users view own profile; active users view all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_active_user()));

create policy "Active users can view categories"
  on public.categories for select to authenticated
  using ((select public.is_active_user()));

create policy "Active users can view suppliers"
  on public.suppliers for select to authenticated
  using ((select public.is_active_user()));

create policy "Active users can view items"
  on public.items for select to authenticated
  using ((select public.is_active_user()));

create policy "Active users can view stock batches"
  on public.stock_batches for select to authenticated
  using ((select public.is_active_user()));

create policy "Active users can view stock movements"
  on public.stock_movements for select to authenticated
  using ((select public.is_active_user()));

-- ---------------------------------------------------------------------------
-- set_user_role: "last admin" now means last ACTIVE admin.
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role)
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

  if v_profile.role = 'admin' and v_profile.status = 'active' and p_role <> 'admin' then
    perform 1 from public.profiles where role = 'admin' and status = 'active' for update;
    if (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
      raise exception 'Cannot demote the last active administrator' using errcode = '42501';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id
  returning * into v_profile;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_user_status: approve, disable or re-enable an account (admins only).
-- ---------------------------------------------------------------------------
create function public.set_user_status(p_user_id uuid, p_status public.account_status)
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
    raise exception 'Only administrators can change account status' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own account status' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if v_profile.role = 'admin' and v_profile.status = 'active' and p_status <> 'active' then
    perform 1 from public.profiles where role = 'admin' and status = 'active' for update;
    if (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
      raise exception 'Cannot disable the last active administrator' using errcode = '42501';
    end if;
  end if;

  update public.profiles set status = p_status where id = p_user_id
  returning * into v_profile;
  return v_profile;
end;
$$;

revoke execute on function public.set_user_status(uuid, public.account_status) from public, anon;
grant  execute on function public.set_user_status(uuid, public.account_status) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_users: profiles plus email/login info from auth.users.
-- Emails stay private: only admins can call this, and they are never copied
-- into the profiles table that every active user can read.
-- ---------------------------------------------------------------------------
create function public.admin_list_users()
returns table (
  id                 uuid,
  email              text,
  full_name          text,
  role               public.app_role,
  status             public.account_status,
  created_at         timestamptz,
  last_sign_in_at    timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Only administrators can list users' using errcode = '42501';
  end if;

  return query
    select p.id, u.email::text, p.full_name, p.role, p.status, p.created_at,
           u.last_sign_in_at, u.email_confirmed_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by (p.status = 'pending') desc, p.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant  execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
-- bootstrap_admin: also activates the account.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_admin(p_email text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles where role = 'admin' and status = 'active') then
    raise exception 'An active administrator already exists; use set_user_role instead'
      using errcode = '42501';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user_id is null then
    raise exception 'No user with that email. Sign up first, then run this again.'
      using errcode = 'P0002';
  end if;

  update public.profiles set role = 'admin', status = 'active' where id = v_user_id
  returning * into v_profile;
  return v_profile;
end;
$$;

revoke execute on function public.bootstrap_admin(text) from public, anon, authenticated;
