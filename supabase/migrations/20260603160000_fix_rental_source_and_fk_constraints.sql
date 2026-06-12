-- ============================================================
-- Migration: Fix rental_orders source constraint and product_variant_id nullable
-- Date: 2026-06-03
-- Problems:
--   1. source constraint only allows 'formal' and 'costume_harian' but
--      Edge Function inserts source='online' for customer checkout.
--   2. rental_order_items.product_variant_id is NOT NULL but Edge Function
--      inserts into dressing_room_product_variant_id (not product_variant_id).
-- ============================================================

-- 1. Fix source constraint to include 'online'
ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_source_check;
ALTER TABLE public.rental_orders ADD CONSTRAINT rental_orders_source_check
  CHECK (source IN ('formal', 'costume_harian', 'online'));

-- 2. Make product_variant_id nullable on rental_order_items
--    (new DR orders use dressing_room_product_variant_id instead)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_order_items'
      AND column_name  = 'product_variant_id'
      AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE public.rental_order_items
      ALTER COLUMN product_variant_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Ensure dressing_room_product_variant_id column exists
ALTER TABLE public.rental_order_items
  ADD COLUMN IF NOT EXISTS dressing_room_product_variant_id BIGINT
    REFERENCES public.dressing_room_product_variants(id) ON DELETE SET NULL;

-- 4. Ensure current_status column exists with default
ALTER TABLE public.rental_order_items
  ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'reserved',
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Drop + re-add current_status constraint to ensure 'reserved' is allowed
ALTER TABLE public.rental_order_items DROP CONSTRAINT IF EXISTS rental_order_items_current_status_check;
ALTER TABLE public.rental_order_items ADD CONSTRAINT rental_order_items_current_status_check
  CHECK (current_status IN ('reserved', 'rented', 'in_laundry', 'damaged', 'returned_pending', 'returned', 'lost', 'hold'));
