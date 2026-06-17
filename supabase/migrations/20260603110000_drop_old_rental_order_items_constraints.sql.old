-- ============================================================
-- Migration: Drop NOT NULL constraints from unused old columns in rental_order_items
-- Date: 2026-06-03
-- ============================================================

ALTER TABLE public.rental_order_items
  ALTER COLUMN product_price DROP NOT NULL,
  ALTER COLUMN deposit_amount DROP NOT NULL,
  ALTER COLUMN rental_cost DROP NOT NULL,
  ALTER COLUMN total_item_cost DROP NOT NULL;
