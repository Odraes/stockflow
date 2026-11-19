-- =============================================================================
-- StockPilot · Migration 8: unique supplier names (case-insensitive)
-- Prevents "Metro Dairy" and "metro dairy " appearing as two suppliers.
-- =============================================================================
create unique index suppliers_name_unique on public.suppliers (lower(btrim(name)));
