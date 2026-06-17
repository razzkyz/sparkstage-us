-- ============================================
-- Migration: Add missing columns to rental_orders
-- Date: 2026-06-03
-- ============================================

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'online',
ADD COLUMN IF NOT EXISTS notes TEXT;
