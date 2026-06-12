-- ============================================================
-- Migration: Fix ALL check constraints for rental tables at once
-- Date: 2026-06-03
-- This adds 'reserved' to both rental_item_status_history.status
-- and rental_order_items.current_status so new RTL orders work.
-- ============================================================

-- 1. Fix rental_item_status_history.status → add 'reserved'
ALTER TABLE public.rental_item_status_history DROP CONSTRAINT IF EXISTS rental_item_status_history_status_check;
ALTER TABLE public.rental_item_status_history ADD CONSTRAINT rental_item_status_history_status_check
  CHECK (status IN ('reserved', 'rented', 'in_laundry', 'damaged', 'returned_pending', 'returned', 'lost', 'hold'));

-- 2. Fix rental_order_items.current_status → add 'reserved' (already done but ensure consistency)
ALTER TABLE public.rental_order_items DROP CONSTRAINT IF EXISTS rental_order_items_current_status_check;
ALTER TABLE public.rental_order_items ADD CONSTRAINT rental_order_items_current_status_check
  CHECK (current_status IN ('reserved', 'rented', 'in_laundry', 'damaged', 'returned_pending', 'returned', 'lost', 'hold'));

-- 3. Fix rental_orders.status → keep all valid statuses together
ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_status_check;
ALTER TABLE public.rental_orders ADD CONSTRAINT rental_orders_status_check
  CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'active', 'due_soon', 'overdue', 'returned', 'refund_process', 'completed', 'cancelled', 'refunded'));

-- 4. Fix rental_orders.source → ensure 'formal' is allowed
ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_source_check;
ALTER TABLE public.rental_orders ADD CONSTRAINT rental_orders_source_check
  CHECK (source IN ('formal', 'costume_harian'));

-- 5. Fix rental_orders.payment_status → ensure 'unpaid' and 'paid' are correct
ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_payment_status_check;
ALTER TABLE public.rental_orders ADD CONSTRAINT rental_orders_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));
