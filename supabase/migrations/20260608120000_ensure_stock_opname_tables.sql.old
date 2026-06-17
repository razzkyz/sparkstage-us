-- Ensure stock opname tables exist
-- This migration creates the stock_opname system tables if they don't exist

-- ============================================
-- 1. Stock Opname Table (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opname (
  id BIGSERIAL PRIMARY KEY,
  opname_number TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL DEFAULT 'SparkStage55',
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out', 'adjustment')),
  reason TEXT,
  notes TEXT,
  -- Opname period for calculating quantity_sold from order_items
  opname_start_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() - INTERVAL '1 day'),
  opname_end_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_opname_created_by ON public.stock_opname(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_opname_transaction_date ON public.stock_opname(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_opname_transaction_type ON public.stock_opname(transaction_type);

-- ============================================
-- 2. Stock Opname Items Table (Detail)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opname_items (
  id BIGSERIAL PRIMARY KEY,
  stock_opname_id BIGINT NOT NULL REFERENCES public.stock_opname(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  -- Stock tracking workflow
  quantity_before INTEGER NOT NULL DEFAULT 0,         -- Stock awal (before opname period)
  quantity_sold INTEGER NOT NULL DEFAULT 0,           -- Sold from order_items during period
  quantity_expected INTEGER NOT NULL DEFAULT 0,       -- Calculated: quantity_before - quantity_sold
  quantity_actual INTEGER,                             -- Physical count by staff during opname
  quantity_discrepancy INTEGER,                        -- Calculated: quantity_actual - quantity_expected (if exists)
  -- Additional tracking
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_per_unit NUMERIC(10, 2),
  discrepancy_reason TEXT,                            -- Why stock doesn't match (e.g., "hilang 1 untuk KOL", "rusak", dll)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname_id ON public.stock_opname_items(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_product_id ON public.stock_opname_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_variant_id ON public.stock_opname_items(variant_id);

-- ============================================
-- 2.5 Function to get quantity sold from order_items
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
-- 2.6 Trigger to calculate expected and discrepancy quantities
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
  
  -- Fallback if dates not set (shouldn't happen with defaults, but safe)
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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_stock_opname_quantities ON public.stock_opname_items;

CREATE TRIGGER trigger_calculate_stock_opname_quantities
  BEFORE INSERT OR UPDATE ON public.stock_opname_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_stock_opname_quantities();


-- ============================================
-- 3. Auto-generate Stock Opname Number
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_stock_opname_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_number INTEGER;
  v_new_number TEXT;
BEGIN
  -- Get the last number from existing opname records
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN opname_number ~ '^#sop-[0-9]+$' 
        THEN SUBSTRING(opname_number FROM 6)::INTEGER
        ELSE 0
      END
    ),
    0
  )
  INTO v_last_number
  FROM public.stock_opname;

  -- Generate new number with padding
  v_new_number := '#sop-' || LPAD((v_last_number + 1)::TEXT, 5, '0');
  
  RETURN v_new_number;
END;
$$;

-- ============================================
-- 4. Trigger to auto-generate opname_number
-- ============================================
CREATE OR REPLACE FUNCTION public.set_stock_opname_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.opname_number IS NULL OR NEW.opname_number = '' THEN
    NEW.opname_number := public.generate_stock_opname_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists (can't use IF NOT EXISTS for triggers in older PG versions)
DROP TRIGGER IF EXISTS trigger_set_stock_opname_number ON public.stock_opname;

CREATE TRIGGER trigger_set_stock_opname_number
  BEFORE INSERT ON public.stock_opname
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_opname_number();

-- Enable RLS on stock_opname tables (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stock_opname' AND schemaname = 'public') THEN
    RAISE NOTICE 'stock_opname table does not exist yet, skipping RLS setup';
  ELSE
    ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all stock opname" ON public.stock_opname;
DROP POLICY IF EXISTS "Admin can insert stock opname" ON public.stock_opname;
DROP POLICY IF EXISTS "Admin can update stock opname" ON public.stock_opname;
DROP POLICY IF EXISTS "Owner can view stock opname" ON public.stock_opname;
DROP POLICY IF EXISTS "Admin can view all stock opname items" ON public.stock_opname_items;
DROP POLICY IF EXISTS "Admin can insert stock opname items" ON public.stock_opname_items;

-- RLS Policies for stock_opname
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stock_opname' AND schemaname = 'public') THEN
    -- Admin policies
    CREATE POLICY "Admin can view all stock opname" ON public.stock_opname
      FOR SELECT
      USING (public.is_admin() OR auth.role() = 'service_role');

    CREATE POLICY "Admin can insert stock opname" ON public.stock_opname
      FOR INSERT
      WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

    CREATE POLICY "Admin can update stock opname" ON public.stock_opname
      FOR UPDATE
      USING (public.is_admin() OR auth.role() = 'service_role')
      WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

    -- Owner policy (view only)
    CREATE POLICY "Owner can view stock opname" ON public.stock_opname
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_role_assignments
          WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'super_admin')
        )
      );

    -- RLS Policies for stock_opname_items
    CREATE POLICY "Admin can view all stock opname items" ON public.stock_opname_items
      FOR SELECT
      USING (public.is_admin() OR auth.role() = 'service_role');

    CREATE POLICY "Admin can insert stock opname items" ON public.stock_opname_items
      FOR INSERT
      WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
