-- ============================================
-- Migration: Add Shipping Fields to Order Products
-- Date: 2026-06-10
-- Description: Add shipping address and delivery tracking fields
-- Safety: All columns are nullable (backward compatible)
-- ============================================

-- Add shipping address fields
ALTER TABLE public.order_products
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_province_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_subdistrict_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_courier TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_delivery_date TEXT;

-- Add indexes for filtering and queries
CREATE INDEX IF NOT EXISTS idx_order_products_shipping_courier 
  ON public.order_products (shipping_courier) 
  WHERE shipping_courier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_products_tracking_number 
  ON public.order_products (tracking_number) 
  WHERE tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_products_shipped_at 
  ON public.order_products (shipped_at) 
  WHERE shipped_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.order_products.shipping_address IS 
  'Full shipping address for delivery orders';
COMMENT ON COLUMN public.order_products.shipping_province_id IS 
  'RajaOngkir province ID for shipping calculation';
COMMENT ON COLUMN public.order_products.shipping_city_id IS 
  'RajaOngkir city ID for shipping calculation';
COMMENT ON COLUMN public.order_products.shipping_subdistrict_id IS 
  'RajaOngkir subdistrict ID for shipping calculation';
COMMENT ON COLUMN public.order_products.shipping_courier IS 
  'Courier code: jne, tiki, pos, etc. NULL = pickup';
COMMENT ON COLUMN public.order_products.shipping_service IS 
  'Service type: REG, YES, OKE, etc.';
COMMENT ON COLUMN public.order_products.tracking_number IS 
  'Resi/AWB number from courier';
COMMENT ON COLUMN public.order_products.shipped_at IS 
  'Timestamp when order was shipped by admin';
COMMENT ON COLUMN public.order_products.estimated_delivery_date IS 
  'Estimated delivery timeframe (e.g. "2-3 hari")';
