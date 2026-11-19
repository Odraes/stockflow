-- =============================================================================
-- StockPilot · database test suite
--
-- Run in the Supabase SQL Editor (or via MCP) as the `postgres` user.
-- Everything runs in ONE transaction that is always rolled back at the end by
-- a deliberate exception, so no test data is left behind:
--   * success -> error message "ALL N TESTS PASSED"
--   * failure -> error message "TEST FAILED: <name> ..."
--
-- Users are simulated the same way Supabase does for API requests: switch to
-- the `authenticated` (or `anon`) role and set the JWT claims so auth.uid()
-- returns the test user's id.
-- =============================================================================
do $tests$
declare
  c_admin   constant uuid := '00000000-0000-4000-a000-00000000a001';
  c_manager constant uuid := '00000000-0000-4000-a000-00000000a002';
  c_staff   constant uuid := '00000000-0000-4000-a000-00000000a003';

  v_passed  int := 0;
  v_cat     uuid;
  v_cat_unused uuid;
  v_sup     uuid;
  v_item    uuid;
  v_item2   uuid;
  v_batch_a uuid;
  v_batch_b uuid;
  v_batch_c uuid;
  v_batch_x uuid;
  v_n       int;
  v_num     numeric;
  v_txt     text;
  v_hint    text;
  v_state   text;
  v_ops     int;
begin
  -- ---------------------------------------------------------------- setup ---
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (c_admin,   't-admin@stockpilot.test',   'authenticated', 'authenticated', '{"full_name":"Test Admin"}'),
    (c_manager, 't-manager@stockpilot.test', 'authenticated', 'authenticated', '{"full_name":"Test Manager"}'),
    -- tries to self-assign admin through sign-up metadata:
    (c_staff,   't-staff@stockpilot.test',   'authenticated', 'authenticated', '{"full_name":"Test Staff","role":"admin"}');

  -- T: profile trigger always assigns staff, ignores metadata role
  select count(*) into v_n from public.profiles
   where id in (c_admin, c_manager, c_staff) and role = 'staff';
  if v_n <> 3 then raise exception 'TEST FAILED: new users default to staff (got % staff)', v_n; end if;
  v_passed := v_passed + 1;

  -- Demote any pre-existing admins inside this rolled-back transaction so
  -- bootstrap_admin can be tested regardless of the real project state.
  update public.profiles set role = 'staff' where role = 'admin';

  -- T: bootstrap_admin promotes the first admin, then refuses
  perform public.bootstrap_admin('T-Admin@StockPilot.test');
  if (select role from public.profiles where id = c_admin) <> 'admin' then
    raise exception 'TEST FAILED: bootstrap_admin'; end if;
  begin
    perform public.bootstrap_admin('t-manager@stockpilot.test');
    raise exception 'TEST FAILED: second bootstrap_admin should be refused';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 2;

  update public.profiles set role = 'manager' where id = c_manager;
  select id into v_cat from public.categories where name = 'Dairy Products';
  select id into v_cat_unused from public.categories where name = 'Cleaning Supplies';

  -- ------------------------------------------------------------ anonymous ---
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  begin
    perform count(*) from public.items;
    raise exception 'TEST FAILED: anon can read items';
  exception when insufficient_privilege then null; end;
  begin
    perform public.record_usage(gen_random_uuid(), 1, 'ml');
    raise exception 'TEST FAILED: anon can call record_usage';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 2;

  -- ---------------------------------------------------------------- staff ---
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c_staff, 'role', 'authenticated')::text, true);

  select count(*) into v_n from public.categories;
  if v_n < 8 then raise exception 'TEST FAILED: staff can read categories'; end if;
  v_passed := v_passed + 1;

  begin
    insert into public.categories (name) values ('Hacked');
    raise exception 'TEST FAILED: staff created a category';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.items (name, sku, category_id, unit) values ('X', 'X1', v_cat, 'g');
    raise exception 'TEST FAILED: staff created an item';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set role = 'admin' where id = c_staff;
    raise exception 'TEST FAILED: staff changed own role via UPDATE';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_user_role(c_staff, 'admin');
    raise exception 'TEST FAILED: staff changed own role via set_user_role';
  exception when insufficient_privilege then null; end;
  begin
    perform public.bootstrap_admin('t-staff@stockpilot.test');
    raise exception 'TEST FAILED: authenticated user can call bootstrap_admin';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 5;

  -- staff may edit their own name, but not someone else's (RLS hides the row)
  update public.profiles set full_name = 'Renamed Staff' where id = c_staff;
  update public.profiles set full_name = 'Hacked' where id = c_manager;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'TEST FAILED: staff renamed another user'; end if;
  v_passed := v_passed + 1;

  -- ------------------------------------------------- manager: master data ---
  perform set_config('request.jwt.claims', json_build_object('sub', c_manager, 'role', 'authenticated')::text, true);

  insert into public.suppliers (name, email) values ('Test Dairy Supplier', 'orders@example.test')
  returning id into v_sup;

  insert into public.items (name, sku, category_id, supplier_id, unit, min_stock)
  values ('Fresh milk', '  milk-01 ', v_cat, v_sup, 'ml', 2000)
  returning id, sku into v_item, v_txt;
  if v_txt <> 'MILK-01' then raise exception 'TEST FAILED: SKU normalised (got %)', v_txt; end if;
  if (select created_by from public.items where id = v_item) <> c_manager then
    raise exception 'TEST FAILED: created_by stamped'; end if;
  v_passed := v_passed + 2;

  begin
    insert into public.items (name, sku, category_id, unit) values ('Dup', 'Milk-01', v_cat, 'ml');
    raise exception 'TEST FAILED: duplicate SKU accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.items (name, sku, category_id, unit, quantity) values ('Q', 'Q1', v_cat, 'g', 999);
    raise exception 'TEST FAILED: item inserted with a quantity';
  exception when insufficient_privilege then null; end;
  begin
    update public.items set quantity = 999 where id = v_item;
    raise exception 'TEST FAILED: quantity edited directly';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.items where id = v_item;
    raise exception 'TEST FAILED: item deleted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_user_role(c_staff, 'manager');
    raise exception 'TEST FAILED: manager changed a role';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 5;

  -- --------------------------------------------- manager: receiving stock ---
  select batch_id into v_batch_b from public.receive_stock(v_item, 1000, 'ml', v_sup,
    p_expiration_date => current_date + 5, p_batch_number => 'LOT-B');
  select batch_id into v_batch_a from public.receive_stock(v_item, 1000, 'ml', v_sup,
    p_expiration_date => current_date + 2, p_batch_number => 'LOT-A');
  select batch_id into v_batch_c from public.receive_stock(v_item, 500, 'ml', v_sup,
    p_total_cost => 10);

  if (select quantity from public.items where id = v_item) <> 2500 then
    raise exception 'TEST FAILED: quantity after receiving'; end if;
  if (select unit_cost from public.stock_batches where id = v_batch_c) <> 0.02 then
    raise exception 'TEST FAILED: unit cost derived from total cost'; end if;
  select count(*) into v_n from public.stock_movements
   where item_id = v_item and type = 'receive' and user_id = c_manager and supplier_id = v_sup;
  if v_n <> 3 then raise exception 'TEST FAILED: receive movements logged (got %)', v_n; end if;
  v_passed := v_passed + 3;

  -- validation
  begin perform public.receive_stock(v_item, 10, 'g');
    raise exception 'TEST FAILED: wrong unit accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.receive_stock(v_item, -5, 'ml');
    raise exception 'TEST FAILED: negative quantity accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.receive_stock(v_item, 0, 'ml');
    raise exception 'TEST FAILED: zero quantity accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.receive_stock(v_item, 1.2345, 'ml');
    raise exception 'TEST FAILED: 4 decimals accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.receive_stock(v_item, 10, 'ml', p_received_at => now() + interval '1 day');
    raise exception 'TEST FAILED: future date accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.receive_stock(v_item, 10, 'ml', p_unit_cost => 1, p_total_cost => 10);
    raise exception 'TEST FAILED: both costs accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.receive_stock(v_item, 10, 'ml', p_expiration_date => current_date - 1);
    raise exception 'TEST FAILED: already-expired delivery accepted';
  exception when invalid_parameter_value then null; end;
  v_passed := v_passed + 7;

  -- ------------------------------------------------------ staff: FEFO usage ---
  perform set_config('request.jwt.claims', json_build_object('sub', c_staff, 'role', 'authenticated')::text, true);

  begin perform public.receive_stock(v_item, 10, 'ml');
    raise exception 'TEST FAILED: staff received stock';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 1;

  -- 1500 ml must come from LOT-A (expires first, 1000) then LOT-B (500)
  select count(*), count(distinct operation_id) into v_n, v_ops
    from public.record_usage(v_item, 1500, 'ml', p_note => 'Morning lattes');
  if v_n <> 2 or v_ops <> 1 then
    raise exception 'TEST FAILED: usage split into 2 rows with one operation_id (got %, %)', v_n, v_ops; end if;
  if (select remaining_quantity from public.stock_batches where id = v_batch_a) <> 0
     or (select remaining_quantity from public.stock_batches where id = v_batch_b) <> 500
     or (select remaining_quantity from public.stock_batches where id = v_batch_c) <> 500 then
    raise exception 'TEST FAILED: FEFO order'; end if;
  if (select quantity from public.items where id = v_item) <> 1000 then
    raise exception 'TEST FAILED: quantity after usage'; end if;
  -- running totals chain correctly: 2500 -> 1500 -> 1000
  if not exists (select 1 from public.stock_movements where item_id = v_item and type = 'usage'
                  and previous_quantity = 2500 and resulting_quantity = 1500 and batch_id = v_batch_a)
     or not exists (select 1 from public.stock_movements where item_id = v_item and type = 'usage'
                  and previous_quantity = 1500 and resulting_quantity = 1000 and batch_id = v_batch_b) then
    raise exception 'TEST FAILED: previous/resulting quantities'; end if;
  v_passed := v_passed + 4;

  begin
    perform public.record_usage(v_item, 1001, 'ml');
    raise exception 'TEST FAILED: usage beyond stock accepted';
  exception when sqlstate 'SP001' then null; end;
  if (select quantity from public.items where id = v_item) <> 1000 then
    raise exception 'TEST FAILED: failed usage changed stock'; end if;
  v_passed := v_passed + 2;

  begin perform public.record_wastage(v_item, 100, 'ml', '   ');
    raise exception 'TEST FAILED: wastage without reason accepted';
  exception when invalid_parameter_value then null; end;
  perform public.record_wastage(v_item, 100, 'ml', 'Spilled');
  if (select remaining_quantity from public.stock_batches where id = v_batch_b) <> 400 then
    raise exception 'TEST FAILED: wastage FEFO'; end if;
  v_passed := v_passed + 2;

  begin perform public.adjust_stock(v_item, 5000, 'ml', 'Count');
    raise exception 'TEST FAILED: staff adjusted stock';
  exception when insufficient_privilege then null; end;
  begin
    update public.stock_movements set quantity_change = -1 where item_id = v_item;
    raise exception 'TEST FAILED: staff edited history';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.stock_movements (operation_id, item_id, user_id, type, quantity_change, previous_quantity, resulting_quantity)
    values (gen_random_uuid(), v_item, c_staff, 'receive', 1, 0, 1);
    raise exception 'TEST FAILED: staff inserted a movement';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 3;

  -- --------------------------------------------------- expired batch rules ---
  perform set_config('request.jwt.claims', json_build_object('sub', c_manager, 'role', 'authenticated')::text, true);
  -- delivered 10 days ago, expired 3 days ago
  select batch_id into v_batch_x from public.receive_stock(v_item, 200, 'ml',
    p_received_at => now() - interval '10 days', p_expiration_date => current_date - 3);

  perform set_config('request.jwt.claims', json_build_object('sub', c_staff, 'role', 'authenticated')::text, true);
  -- stock: 1100 total, but 200 is expired -> only 900 usable
  begin
    perform public.record_usage(v_item, 1000, 'ml');
    raise exception 'TEST FAILED: usage consumed expired stock';
  exception when sqlstate 'SP001' then
    get stacked diagnostics v_hint = pg_exception_hint;
    if v_hint is null or v_hint not like '%expired%' then
      raise exception 'TEST FAILED: expired hint missing (got %)', v_hint; end if;
  end;
  perform public.record_wastage(v_item, 200, 'ml', 'Expired', p_batch_id => v_batch_x);
  if (select remaining_quantity from public.stock_batches where id = v_batch_x) <> 0 then
    raise exception 'TEST FAILED: wastage of a specific expired batch'; end if;
  v_passed := v_passed + 2;

  -- --------------------------------------------------- manager adjustments ---
  perform set_config('request.jwt.claims', json_build_object('sub', c_manager, 'role', 'authenticated')::text, true);
  -- current 900 -> counted 1000: +100 as a new batch
  select quantity_change, previous_quantity, resulting_quantity into v_num, v_n, v_ops
    from public.adjust_stock(v_item, 1000, 'ml', 'Found an unrecorded carton');
  if v_num <> 100 or v_n <> 900 or v_ops <> 1000 then
    raise exception 'TEST FAILED: positive adjustment (% % %)', v_num, v_n, v_ops; end if;
  -- counted 300: remove 700 FEFO
  perform public.adjust_stock(v_item, 300, 'ml', 'Monthly stock count');
  if (select quantity from public.items where id = v_item) <> 300 then
    raise exception 'TEST FAILED: negative adjustment'; end if;
  begin perform public.adjust_stock(v_item, 300, 'ml', 'Same');
    raise exception 'TEST FAILED: no-op adjustment accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.adjust_stock(v_item, 10, 'ml', '');
    raise exception 'TEST FAILED: adjustment without reason accepted';
  exception when invalid_parameter_value then null; end;
  v_passed := v_passed + 4;

  -- -------------------------------------------- item rules & archiving ---
  begin
    update public.items set unit = 'g' where id = v_item;
    raise exception 'TEST FAILED: unit changed despite history';
  exception when invalid_parameter_value then null; end;

  update public.items set is_active = false where id = v_item;
  perform set_config('request.jwt.claims', json_build_object('sub', c_staff, 'role', 'authenticated')::text, true);
  begin perform public.record_usage(v_item, 10, 'ml');
    raise exception 'TEST FAILED: usage on archived item';
  exception when invalid_parameter_value then null; end;
  perform public.record_wastage(v_item, 10, 'ml', 'Write-off after archiving');   -- allowed
  v_passed := v_passed + 3;

  perform set_config('request.jwt.claims', json_build_object('sub', c_manager, 'role', 'authenticated')::text, true);
  begin
    delete from public.categories where id = v_cat;          -- used by Fresh milk
    raise exception 'TEST FAILED: in-use category deleted';
  exception when foreign_key_violation then null; end;
  delete from public.categories where id = v_cat_unused;     -- unused: allowed
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'TEST FAILED: unused category delete'; end if;
  v_passed := v_passed + 2;

  -- ----------------------------------------------------- role management ---
  perform set_config('request.jwt.claims', json_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  perform public.set_user_role(c_staff, 'manager');
  if (select role from public.profiles where id = c_staff) <> 'manager' then
    raise exception 'TEST FAILED: admin set role'; end if;
  begin perform public.set_user_role(c_admin, 'staff');
    raise exception 'TEST FAILED: admin changed own role';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 2;

  -- ------------------------------------------- audit & consistency guards ---
  perform set_config('role', 'postgres', true);

  begin
    delete from public.stock_movements where item_id = v_item;
    raise exception 'TEST FAILED: postgres deleted history';
  exception when insufficient_privilege then null; end;
  begin
    update public.stock_batches set unit_cost = 99 where id = v_batch_a;
    raise exception 'TEST FAILED: batch cost edited';
  exception when insufficient_privilege then null; end;
  v_passed := v_passed + 2;

  -- Every pending deferred consistency check passes...
  set constraints all immediate;
  set constraints all deferred;
  -- ...and a silent edit that bypasses the functions is caught.
  begin
    update public.items set quantity = quantity + 1 where id = v_item;
    set constraints all immediate;
    raise exception 'TEST FAILED: inconsistent quantity accepted';
  exception when check_violation then null; end;
  set constraints all deferred;
  v_passed := v_passed + 2;

  -- item total == sum of batches; every movement has a user; ledger adds up
  select quantity - (select sum(remaining_quantity) from public.stock_batches where item_id = v_item)
    into v_num from public.items where id = v_item;
  if v_num <> 0 then raise exception 'TEST FAILED: item/batch totals differ by %', v_num; end if;
  if (select sum(quantity_change) from public.stock_movements where item_id = v_item)
     <> (select quantity from public.items where id = v_item) then
    raise exception 'TEST FAILED: sum of movements <> item quantity'; end if;
  if exists (select 1 from public.stock_movements where item_id = v_item and user_id is null) then
    raise exception 'TEST FAILED: movement without user'; end if;
  v_passed := v_passed + 3;

  raise exception 'ALL % TESTS PASSED (all test data rolled back)', v_passed;
end
$tests$;
