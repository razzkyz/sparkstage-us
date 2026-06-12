-- ============================================================
-- Migration: Add 'reserved' to rental_order_items current_status constraint
-- Date: 2026-06-03
-- ============================================================

ALTER TABLE public.rental_order_items DROP CONSTRAINT IF EXISTS rental_order_items_current_status_check;
ALTER TABLE public.rental_order_items ADD CONSTRAINT rental_order_items_current_status_check
  CHECK (current_status IN ('reserved', 'rented', 'in_laundry', 'damaged', 'returned_pending', 'returned', 'lost', 'hold'));
