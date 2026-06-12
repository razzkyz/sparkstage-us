-- ============================================================
-- Migration: Add 'pending' to rental_orders status check
-- Date: 2026-06-03
-- ============================================================

ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_status_check;
ALTER TABLE public.rental_orders ADD CONSTRAINT rental_orders_status_check 
  CHECK (status IN ('pending', 'active', 'due_soon', 'overdue', 'returned', 'refund_process', 'completed', 'awaiting_payment', 'paid', 'cancelled', 'refunded'));
