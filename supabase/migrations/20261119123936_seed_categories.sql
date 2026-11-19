-- =============================================================================
-- StockPilot · Migration 5: default inventory categories
--
-- Starting configuration, not sample data: admins/managers can rename or
-- delete these (if unused) from the app. Re-running is harmless.
-- =============================================================================
insert into public.categories (name, description) values
  ('Coffee and Tea',        'Coffee beans, ground coffee, tea leaves, matcha'),
  ('Dairy Products',        'Fresh milk, plant-based milk, cream, butter, cheese'),
  ('Syrups and Sweeteners', 'Flavoured syrups, sugar, condensed milk, sauces'),
  ('Food Ingredients',      'Eggs, flour, chocolate powder and other cooking ingredients'),
  ('Bakery Supplies',       'Bread, pastries and baking supplies'),
  ('Packaging',             'Cups, lids, straws, napkins, takeaway boxes'),
  ('Cleaning Supplies',     'Detergents, sanitiser, cloths'),
  ('Other Supplies',        'Anything that does not fit another category')
on conflict do nothing;
