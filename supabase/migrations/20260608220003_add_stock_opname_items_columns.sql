-- Add quantity tracking columns to stock_opname_items table
-- These columns support the complete stock opname workflow

ALTER TABLE IF EXISTS public.stock_opname_items
ADD COLUMN IF NOT EXISTS quantity_sold INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_expected INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_actual INTEGER,
ADD COLUMN IF NOT EXISTS quantity_discrepancy INTEGER,
ADD COLUMN IF NOT EXISTS discrepancy_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Drop old columns if they exist
ALTER TABLE IF EXISTS public.stock_opname_items
DROP COLUMN IF EXISTS quantity_change,
DROP COLUMN IF EXISTS quantity_after;

-- Add comments
COMMENT ON COLUMN public.stock_opname_items.quantity_sold IS 'Quantity sold during the opname period (calculated from order_items)';
COMMENT ON COLUMN public.stock_opname_items.quantity_expected IS 'Expected stock = quantity_before - quantity_sold (calculated)';
COMMENT ON COLUMN public.stock_opname_items.quantity_actual IS 'Actual physical count by staff during opname';
COMMENT ON COLUMN public.stock_opname_items.quantity_discrepancy IS 'Discrepancy = quantity_actual - quantity_expected (calculated)';
COMMENT ON COLUMN public.stock_opname_items.discrepancy_reason IS 'Reason for discrepancy (e.g., hilang untuk KOL, rusak, dll) - REQUIRED if discrepancy exists';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
