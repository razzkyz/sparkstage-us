-- ============================================================
-- Migration: Add missing quantity and pricing columns to rental_order_items
-- Date: 2026-06-03
-- ============================================================

ALTER TABLE public.rental_order_items
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_rate BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS item_deposit_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rental_cost BIGINT DEFAULT 0;
