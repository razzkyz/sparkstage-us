-- ============================================
-- Migration: Revamp Stock Opname System
-- Date: 2026-06-09
-- Description: Complete overhaul of stock opname to track daily opening, sales, adjustments, and physical counts
-- ============================================

-- ============================================
-- 1. Drop Old Stock Opname Tables
-- ============================================

DROP TRIGGER IF EXISTS trigger_set_stock_opname_number ON public.stock_opname;
DROP FUNCTION IF EXISTS public.set_stock_opname_number();
DROP FUNCTION IF EXISTS public.generate_stock_opname_number();
DROP FUNCTION IF EXISTS public.create_stock_opname(TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_stock_opname_list(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_stock_opname_detail(BIGINT);
DROP FUNCTION IF EXISTS public.delete_stock_opname(BIGINT);
DROP FUNCTION IF EXISTS public.update_stock_opname(BIGINT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.bulk_import_stock_opname(JSONB);

DROP TABLE IF EXISTS public.stock_opname_items CASCADE;
DROP TABLE IF EXISTS public.stock_opname CASCADE;

-- ============================================
-- 2. Stock Opening Table (Daily Stock Awal)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_openings (
  id BIGSERIAL PRIMARY KEY,
  opening_number TEXT NOT NULL UNIQUE,
  opening_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT 'SparkStage55',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(opening_date, location)
);

CREATE INDEX idx_stock_openings_date ON public.stock_openings(opening_date DESC);
CREATE INDEX idx_stock_openings_status ON public.stock_openings(status);
CREATE INDEX idx_stock_openings_created_by ON public.stock_openings(created_by);

COMMENT ON TABLE public.stock_openings IS 'Daily stock opening records (stock awal)';
COMMENT ON COLUMN public.stock_openings.status IS 'draft=editable, confirmed=locked and affects calculations';

-- ============================================
-- 3. Stock Opening Items (Detail Stock Awal)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opening_items (
  id BIGSERIAL PRIMARY KEY,
  stock_opening_id BIGINT NOT NULL REFERENCES public.stock_openings(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  opening_quantity INTEGER NOT NULL CHECK (opening_quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stock_opening_id, variant_id)
);

CREATE INDEX idx_stock_opening_items_opening_id ON public.stock_opening_items(stock_opening_id);
CREATE INDEX idx_stock_opening_items_variant_id ON public.stock_opening_items(variant_id);
CREATE INDEX idx_stock_opening_items_product_id ON public.stock_opening_items(product_id);

COMMENT ON TABLE public.stock_opening_items IS 'Stock opening item details with opening quantities';

-- ============================================
-- 4. Stock Adjustments Table (Manual Adjustments: Gift/KOL/Loss/Gain)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id BIGSERIAL PRIMARY KEY,
  adjustment_number TEXT NOT NULL UNIQUE,
  adjustment_date DATE NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('gift', 'kol', 'loss', 'gain', 'other')),
  reason TEXT NOT NULL,
  notes TEXT,
  location TEXT NOT NULL DEFAULT 'SparkStage55',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_adjustments_date ON public.stock_adjustments(adjustment_date DESC);
CREATE INDEX idx_stock_adjustments_type ON public.stock_adjustments(adjustment_type);
CREATE INDEX idx_stock_adjustments_created_by ON public.stock_adjustments(created_by);

COMMENT ON TABLE public.stock_adjustments IS 'Stock adjustments for gifts, KOL marketing, losses, and other manual changes';
COMMENT ON COLUMN public.stock_adjustments.adjustment_type IS 'gift=hadiah, kol=KOL marketing, loss=kehilangan, gain=penambahan, other=lainnya';

-- ============================================
-- 5. Stock Adjustment Items
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_adjustment_items (
  id BIGSERIAL PRIMARY KEY,
  stock_adjustment_id BIGINT NOT NULL REFERENCES public.stock_adjustments(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity_change INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_adjustment_items_adjustment_id ON public.stock_adjustment_items(stock_adjustment_id);
CREATE INDEX idx_stock_adjustment_items_variant_id ON public.stock_adjustment_items(variant_id);
CREATE INDEX idx_stock_adjustment_items_product_id ON public.stock_adjustment_items(product_id);

COMMENT ON TABLE public.stock_adjustment_items IS 'Stock adjustment item details with quantity changes (positive or negative)';

-- ============================================
-- 6. Stock Opname Table (Physical Count & Variance)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opnames (
  id BIGSERIAL PRIMARY KEY,
  opname_number TEXT NOT NULL UNIQUE,
  opname_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT 'SparkStage55',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(opname_date, location)
);

CREATE INDEX idx_stock_opnames_date ON public.stock_opnames(opname_date DESC);
CREATE INDEX idx_stock_opnames_status ON public.stock_opnames(status);
CREATE INDEX idx_stock_opnames_created_by ON public.stock_opnames(created_by);

COMMENT ON TABLE public.stock_opnames IS 'Stock taking records with physical counts and variance analysis';
COMMENT ON COLUMN public.stock_opnames.status IS 'draft=editable, finalized=locked and triggers reconciliation';

-- ============================================
-- 7. Stock Opname Items (Physical Count Details)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opname_items (
  id BIGSERIAL PRIMARY KEY,
  stock_opname_id BIGINT NOT NULL REFERENCES public.stock_opnames(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  opening_stock INTEGER NOT NULL DEFAULT 0,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  adjustment_quantity INTEGER NOT NULL DEFAULT 0,
  system_stock INTEGER NOT NULL DEFAULT 0,
  physical_count INTEGER NOT NULL,
  variance INTEGER NOT NULL DEFAULT 0,
  variance_reason TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stock_opname_id, variant_id)
);

CREATE INDEX idx_stock_opname_items_opname_id ON public.stock_opname_items(stock_opname_id);
CREATE INDEX idx_stock_opname_items_variant_id ON public.stock_opname_items(variant_id);
CREATE INDEX idx_stock_opname_items_product_id ON public.stock_opname_items(product_id);
CREATE INDEX idx_stock_opname_items_variance ON public.stock_opname_items(variance) WHERE variance != 0;

COMMENT ON TABLE public.stock_opname_items IS 'Stock opname details with calculated system stock vs physical count';
COMMENT ON COLUMN public.stock_opname_items.opening_stock IS 'Stock awal dari opening';
COMMENT ON COLUMN public.stock_opname_items.sold_quantity IS 'Total terjual (kasir + online)';
COMMENT ON COLUMN public.stock_opname_items.adjustment_quantity IS 'Total adjustments (gift, KOL, loss)';
COMMENT ON COLUMN public.stock_opname_items.system_stock IS 'Calculated: opening_stock - sold_quantity + adjustment_quantity';
COMMENT ON COLUMN public.stock_opname_items.physical_count IS 'Actual stock count during opname';
COMMENT ON COLUMN public.stock_opname_items.variance IS 'Difference: physical_count - system_stock';

-- ============================================
-- 8. Auto-generate Stock Opening Number
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_stock_opening_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_number INTEGER;
  v_new_number TEXT;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN opening_number ~ '^#open-[0-9]+$' 
        THEN SUBSTRING(opening_number FROM 7)::INTEGER
        ELSE 0
      END
    ),
    0
  )
  INTO v_last_number
  FROM public.stock_openings;

  v_new_number := '#open-' || LPAD((v_last_number + 1)::TEXT, 5, '0');
  RETURN v_new_number;
END;
$$;

-- ============================================
-- 9. Auto-generate Stock Adjustment Number
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_stock_adjustment_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_number INTEGER;
  v_new_number TEXT;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN adjustment_number ~ '^#adj-[0-9]+$' 
        THEN SUBSTRING(adjustment_number FROM 6)::INTEGER
        ELSE 0
      END
    ),
    0
  )
  INTO v_last_number
  FROM public.stock_adjustments;

  v_new_number := '#adj-' || LPAD((v_last_number + 1)::TEXT, 5, '0');
  RETURN v_new_number;
END;
$$;

-- ============================================
-- 10. Auto-generate Stock Opname Number
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
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN opname_number ~ '^#opname-[0-9]+$' 
        THEN SUBSTRING(opname_number FROM 8)::INTEGER
        ELSE 0
      END
    ),
    0
  )
  INTO v_last_number
  FROM public.stock_opnames;

  v_new_number := '#opname-' || LPAD((v_last_number + 1)::TEXT, 5, '0');
  RETURN v_new_number;
END;
$$;

-- ============================================
-- 11. Triggers for Auto-numbering
-- ============================================
CREATE OR REPLACE FUNCTION public.set_stock_opening_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.opening_number IS NULL OR NEW.opening_number = '' THEN
    NEW.opening_number := public.generate_stock_opening_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_stock_opening_number
  BEFORE INSERT ON public.stock_openings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_opening_number();

CREATE OR REPLACE FUNCTION public.set_stock_adjustment_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.adjustment_number IS NULL OR NEW.adjustment_number = '' THEN
    NEW.adjustment_number := public.generate_stock_adjustment_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_stock_adjustment_number
  BEFORE INSERT ON public.stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_adjustment_number();

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

CREATE TRIGGER trigger_set_stock_opname_number
  BEFORE INSERT ON public.stock_opnames
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_opname_number();

-- ============================================
-- 12. Updated_at Triggers
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stock_openings_updated_at
  BEFORE UPDATE ON public.stock_openings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_stock_adjustments_updated_at
  BEFORE UPDATE ON public.stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_stock_opnames_updated_at
  BEFORE UPDATE ON public.stock_opnames
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_stock_opname_items_updated_at
  BEFORE UPDATE ON public.stock_opname_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 13. RLS Policies
-- ============================================
ALTER TABLE public.stock_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opening_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

-- Stock Openings
CREATE POLICY "Admin can manage stock openings"
  ON public.stock_openings FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can manage stock opening items"
  ON public.stock_opening_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_openings
      WHERE id = stock_opening_items.stock_opening_id
        AND public.is_admin()
    )
  );

-- Stock Adjustments
CREATE POLICY "Admin can manage stock adjustments"
  ON public.stock_adjustments FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can manage stock adjustment items"
  ON public.stock_adjustment_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_adjustments
      WHERE id = stock_adjustment_items.stock_adjustment_id
        AND public.is_admin()
    )
  );

-- Stock Opnames
CREATE POLICY "Admin can manage stock opnames"
  ON public.stock_opnames FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can manage stock opname items"
  ON public.stock_opname_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_opnames
      WHERE id = stock_opname_items.stock_opname_id
        AND public.is_admin()
    )
  );

-- ============================================
-- 14. Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.generate_stock_opening_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_stock_adjustment_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_stock_opname_number() TO authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
