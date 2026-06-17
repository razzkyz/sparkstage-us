-- ============================================
-- Migration: Add Customer Fields to Orders
-- Date: 2026-05-05
-- Description: Add customer_name, customer_email, and customer_phone to orders table for faster display on booking success page
-- ============================================

-- Add customer fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
