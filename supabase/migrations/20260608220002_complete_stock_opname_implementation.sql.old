-- Add missing columns to stock_opname and stock_opname_items tables
-- Complete stock opname workflow implementation

-- ============================================
-- Step 1: Add opname period columns to stock_opname
-- ============================================
ALTER TABLE IF EXISTS public.stock_opname
ADD COLUMN IF NOT EXISTS opname_start_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() - INTERVAL '1 day'),
ADD COLUMN IF NOT EXISTS opname_end_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.stock_opname.opname_start_date IS 'Start date of the opname period for calculating quantity sold from order_items';
COMMENT ON COLUMN public.stock_opname.opname_end_date IS 'End date of the opname period for calculating quantity sold from order_items';

-- ============================================
-- Step 2: Add missing columns to stock_opname_items
-- ============================================
ALTER TABLE IF EXISTS public.stock_opname_items
ADD COLUMN IF NOT EXISTS quantity_sold INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_expected INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_actual INTEGER,
ADD COLUMN IF NOT EXISTS quantity_discrepancy INTEGER,
ADD COLUMN IF NOT EXISTS discrepancy_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Remove old quantity_change and quantity_after columns if they exist (shouldn't after schema redesign)
ALTER TABLE IF EXISTS public.stock_opname_items
DROP COLUMN IF EXISTS quantity_change,
DROP COLUMN IF EXISTS quantity_after;

-- ============================================
-- Step 3: Create/Update function to get quantity sold from order_items
-- ============================================
CREATE OR REPLACE FUNCTION public.get_quantity_sold_for_variant(
  p_variant_id BIGINT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity_sold INTEGER;
BEGIN
  SELECT COALESCE(SUM(oi.quantity), 0)
  INTO v_quantity_sold
  FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE oi.variant_id = p_variant_id
    AND o.status NOT IN ('cancelled', 'abandoned')
    AND o.created_at >= p_start_date
    AND o.created_at < p_end_date;
  
  RETURN v_quantity_sold;
END;
$$;

-- ============================================
-- Step 4: Create/Update trigger to calculate stock opname quantities
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_stock_opname_quantities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Get opname period dates from stock_opname header
  SELECT opname_start_date, opname_end_date
  INTO v_start_date, v_end_date
  FROM public.stock_opname
  WHERE id = NEW.stock_opname_id;
  
  -- Fallback if dates not set
  IF v_start_date IS NULL THEN
    v_start_date := CURRENT_TIMESTAMP - INTERVAL '1 day';
  END IF;
  IF v_end_date IS NULL THEN
    v_end_date := CURRENT_TIMESTAMP;
  END IF;
  
  -- Calculate quantity_sold from order_items during opname period
  NEW.quantity_sold := public.get_quantity_sold_for_variant(
    NEW.variant_id,
    v_start_date,
    v_end_date
  );
  
  -- Calculate expected quantity: before - sold
  NEW.quantity_expected := NEW.quantity_before - NEW.quantity_sold;
  
  -- If quantity_actual is provided, calculate discrepancy
  IF NEW.quantity_actual IS NOT NULL THEN
    NEW.quantity_discrepancy := NEW.quantity_actual - NEW.quantity_expected;
    
    -- Validate: if discrepancy exists, reason is required
    IF NEW.quantity_discrepancy <> 0 AND (NEW.discrepancy_reason IS NULL OR TRIM(NEW.discrepancy_reason) = '') THEN
      RAISE EXCEPTION 'discrepancy_reason is required when stock discrepancy exists (actual: %, expected: %)', 
        NEW.quantity_actual, NEW.quantity_expected;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_calculate_stock_opname_quantities ON public.stock_opname_items;

CREATE TRIGGER trigger_calculate_stock_opname_quantities
  BEFORE INSERT OR UPDATE ON public.stock_opname_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_stock_opname_quantities();

-- ============================================
-- Step 5: Create stock opname report view
-- ============================================
CREATE OR REPLACE VIEW public.stock_opname_report AS
SELECT 
  so.opname_number,
  so.location,
  pv.sku,
  p.name as product_name,
  to_char(so.opname_start_date, 'YYYY-MM-DD HH24:MI') as period_start,
  to_char(so.opname_end_date, 'YYYY-MM-DD HH24:MI') as period_end,
  soi.quantity_before as "STOCK AWAL",
  soi.quantity_sold as "TERJUAL (dari kasir)",
  soi.quantity_expected as "STOCK EXPECTED",
  soi.quantity_actual as "STOCK FISIK (cek)",
  soi.quantity_discrepancy as "SELISIH",
  soi.discrepancy_reason as "ALASAN SELISIH",
  CASE 
    WHEN soi.quantity_discrepancy = 0 THEN '✓ SESUAI'
    WHEN soi.quantity_discrepancy > 0 THEN '⚠ LEBIH (' || soi.quantity_discrepancy || ' pcs)'
    ELSE '❌ KURANG (' || ABS(soi.quantity_discrepancy) || ' pcs)'
  END as status,
  to_char(so.created_at, 'YYYY-MM-DD HH24:MI') as opname_date,
  u.email as created_by
FROM stock_opname so
INNER JOIN stock_opname_items soi ON so.id = soi.stock_opname_id
INNER JOIN product_variants pv ON soi.variant_id = pv.id
INNER JOIN products p ON soi.product_id = p.id
LEFT JOIN auth.users u ON so.created_by = u.id
ORDER BY so.opname_number DESC, p.name;

-- Grant access to authenticated users
GRANT SELECT ON public.stock_opname_report TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
