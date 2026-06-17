-- =====================================================
-- Migration: Create retail_categories table with RLS
-- Created: 2026-06-12
-- Purpose: Create retail_categories table and configure Row Level Security
-- =====================================================

-- Create retail_categories table
CREATE TABLE IF NOT EXISTS public.retail_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department VARCHAR(50) NOT NULL CHECK (department IN ('glam', 'charmbar', 'sparkclub')),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES public.retail_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_retail_categories_department ON public.retail_categories(department);
CREATE INDEX IF NOT EXISTS idx_retail_categories_parent_id ON public.retail_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_retail_categories_slug ON public.retail_categories(slug);
CREATE INDEX IF NOT EXISTS idx_retail_categories_is_active ON public.retail_categories(is_active);

-- Create trigger for updated_at
CREATE TRIGGER set_retail_categories_updated_at
  BEFORE UPDATE ON public.retail_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.retail_categories IS 'Retail product categories organized by department (glam, charmbar, sparkclub)';

-- =====================================================
-- Row Level Security (RLS) Configuration
-- =====================================================

-- Enable RLS on the table
ALTER TABLE public.retail_categories ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public SELECT - Anyone can view active categories
CREATE POLICY "Public can view active retail categories"
  ON public.retail_categories
  FOR SELECT
  TO public
  USING (is_active = true);

-- Policy 2: Admin SELECT - Admins can view all categories (including inactive)
CREATE POLICY "Admins can view all retail categories"
  ON public.retail_categories
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy 3: Admin INSERT - Only admins can create categories
CREATE POLICY "Admins can create retail categories"
  ON public.retail_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy 4: Admin UPDATE - Only admins can update categories
CREATE POLICY "Admins can update retail categories"
  ON public.retail_categories
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 5: Admin DELETE - Only admins can delete categories
CREATE POLICY "Admins can delete retail categories"
  ON public.retail_categories
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- Grant permissions
-- =====================================================

-- Grant usage on sequence to authenticated users (for INSERT)
GRANT USAGE ON SEQUENCE public.retail_categories_id_seq TO authenticated;

-- Grant SELECT to anon (for public viewing)
GRANT SELECT ON public.retail_categories TO anon;

-- Grant full access to authenticated users (RLS will control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retail_categories TO authenticated;

-- =====================================================
-- Add foreign key to product_retail if not exists
-- =====================================================

-- Check if retail_category_id column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_retail' 
    AND column_name = 'retail_category_id'
  ) THEN
    ALTER TABLE public.product_retail 
    ADD COLUMN retail_category_id BIGINT REFERENCES public.retail_categories(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_product_retail_retail_category_id ON public.product_retail(retail_category_id);
    
    COMMENT ON COLUMN public.product_retail.retail_category_id IS 'Foreign key to retail_categories table';
  END IF;
END $$;

-- Check if retail_subcategory_id column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_retail' 
    AND column_name = 'retail_subcategory_id'
  ) THEN
    ALTER TABLE public.product_retail 
    ADD COLUMN retail_subcategory_id BIGINT REFERENCES public.retail_categories(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_product_retail_retail_subcategory_id ON public.product_retail(retail_subcategory_id);
    
    COMMENT ON COLUMN public.product_retail.retail_subcategory_id IS 'Foreign key to retail_categories table (for subcategory)';
  END IF;
END $$;

-- =====================================================
-- Sample data (optional - can be removed if not needed)
-- =====================================================

-- Insert sample categories for each department
INSERT INTO public.retail_categories (department, name, slug, parent_id, is_active)
VALUES
  -- Glam department
  ('glam', 'Makeup', 'glam-makeup', NULL, true),
  ('glam', 'Skincare', 'glam-skincare', NULL, true),
  ('glam', 'Haircare', 'glam-haircare', NULL, true),
  
  -- CharmBar department
  ('charmbar', 'Accessories', 'charmbar-accessories', NULL, true),
  ('charmbar', 'Jewelry', 'charmbar-jewelry', NULL, true),
  ('charmbar', 'Bags', 'charmbar-bags', NULL, true),
  
  -- SparkClub department
  ('sparkclub', 'Apparel', 'sparkclub-apparel', NULL, true),
  ('sparkclub', 'Footwear', 'sparkclub-footwear', NULL, true),
  ('sparkclub', 'Accessories', 'sparkclub-accessories', NULL, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- Verification query (for testing)
-- =====================================================

-- To verify RLS is working correctly, run these queries after migration:
-- 1. As public/anon: SELECT * FROM retail_categories; (should see only is_active=true)
-- 2. As admin: SELECT * FROM retail_categories; (should see all)
-- 3. As admin: INSERT INTO retail_categories (...); (should work)
-- 4. As non-admin: INSERT INTO retail_categories (...); (should fail)
