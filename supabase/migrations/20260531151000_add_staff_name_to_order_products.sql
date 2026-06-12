-- ============================================
-- Migration: Add Sales Staff Name to Order Products
-- Date: 2026-05-31
-- Description: Add sales_staff_name to track which cashier/staff made the POS sale
-- ============================================

ALTER TABLE public.order_products
ADD COLUMN IF NOT EXISTS sales_staff_name TEXT;
