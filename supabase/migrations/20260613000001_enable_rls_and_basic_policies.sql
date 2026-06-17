-- ============================================
-- SparkStage US - Enable RLS and Basic Policies
-- Date: 2026-06-13
-- Description: Enable Row Level Security and add basic access policies
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- User & Profile Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Product Tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Retail Tables
ALTER TABLE public.retail_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_retail ENABLE ROW LEVEL SECURITY;

-- Order Tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_products ENABLE ROW LEVEL SECURITY;

-- Ticket Tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchased_tickets ENABLE ROW LEVEL SECURITY;

-- Rental Tables
ALTER TABLE public.dressing_room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_order_items ENABLE ROW LEVEL SECURITY;

-- Stock Tables
ALTER TABLE public.stock_opening ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opening_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

-- Discount Tables
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_products ENABLE ROW LEVEL SECURITY;

-- Loyalty Tables
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- CMS Tables
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Audit Tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Admin Tables
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner', 'devops')
  );
END;
$$;

-- ============================================
-- PUBLIC READ POLICIES (Anonymous + Authenticated)
-- ============================================

-- Categories: Public read
CREATE POLICY "Allow public read access to active categories"
ON public.categories FOR SELECT
TO public
USING (is_active = true);

-- Products: Public read (active products only)
CREATE POLICY "Allow public read access to active products"
ON public.products FOR SELECT
TO public
USING (is_active = true AND deleted_at IS NULL);

-- Product Variants: Public read (active variants only)
CREATE POLICY "Allow public read access to active product variants"
ON public.product_variants FOR SELECT
TO public
USING (is_active = true AND deleted_at IS NULL);

-- Product Images: Public read
CREATE POLICY "Allow public read access to product images"
ON public.product_images FOR SELECT
TO public
USING (true);

-- Retail Categories: Public read
CREATE POLICY "Allow public read access to active retail categories"
ON public.retail_categories FOR SELECT
TO public
USING (is_active = true);

-- Retail Products: Public read
CREATE POLICY "Allow public read access to active retail products"
ON public.product_retail FOR SELECT
TO public
USING (is_active = true);

-- Tickets: Public read (active tickets only)
CREATE POLICY "Allow public read access to active tickets"
ON public.tickets FOR SELECT
TO public
USING (is_active = true);

-- Ticket Types: Public read
CREATE POLICY "Allow public read access to ticket types"
ON public.ticket_types FOR SELECT
TO public
USING (is_active = true);

-- Ticket Availability: Public read
CREATE POLICY "Allow public read access to ticket availability"
ON public.ticket_availability FOR SELECT
TO public
USING (is_available = true);

-- Banners: Public read
CREATE POLICY "Allow public read access to active banners"
ON public.banners FOR SELECT
TO public
USING (is_active = true);

-- News: Public read (published only)
CREATE POLICY "Allow public read access to published news"
ON public.news_posts FOR SELECT
TO public
USING (is_published = true);

-- Dressing Room Categories: Public read
CREATE POLICY "Allow public read access to dressing room categories"
ON public.dressing_room_categories FOR SELECT
TO public
USING (is_active = true);

-- App Configs: Public read
CREATE POLICY "Allow public read access to app configs"
ON public.app_configs FOR SELECT
TO public
USING (true);

-- ============================================
-- USER-SPECIFIC POLICIES (Authenticated users)
-- ============================================

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Orders: Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_hidden = false);

CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Order Products: Users can view their own order items
CREATE POLICY "Users can view their own order products"
ON public.order_products FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_products.order_id
  AND orders.user_id = auth.uid()
));

-- Purchased Tickets: Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.purchased_tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_hidden = false);

CREATE POLICY "Users can insert their own tickets"
ON public.purchased_tickets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Rental Orders: Users can view their own rentals
CREATE POLICY "Users can view their own rental orders"
ON public.rental_orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own rental orders"
ON public.rental_orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Loyalty Points: Users can view their own points
CREATE POLICY "Users can view their own loyalty points"
ON public.customer_loyalty_points FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view their own points history"
ON public.loyalty_points_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- ADMIN POLICIES (Full access for admins)
-- ============================================

-- Categories: Admin full access
CREATE POLICY "Admins have full access to categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Products: Admin full access
CREATE POLICY "Admins have full access to products"
ON public.products FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Product Variants: Admin full access
CREATE POLICY "Admins have full access to product variants"
ON public.product_variants FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Product Images: Admin full access
CREATE POLICY "Admins have full access to product images"
ON public.product_images FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Retail Categories: Admin full access
CREATE POLICY "Admins have full access to retail categories"
ON public.retail_categories FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Retail Products: Admin full access
CREATE POLICY "Admins have full access to retail products"
ON public.product_retail FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Orders: Admin can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Order Products: Admin can view all
CREATE POLICY "Admins can view all order products"
ON public.order_products FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update order products"
ON public.order_products FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tickets: Admin full access
CREATE POLICY "Admins have full access to tickets"
ON public.tickets FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ticket Types: Admin full access
CREATE POLICY "Admins have full access to ticket types"
ON public.ticket_types FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ticket Availability: Admin full access
CREATE POLICY "Admins have full access to ticket availability"
ON public.ticket_availability FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Purchased Tickets: Admin can view all
CREATE POLICY "Admins can view all purchased tickets"
ON public.purchased_tickets FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update purchased tickets"
ON public.purchased_tickets FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Stock Management: Admin only
CREATE POLICY "Admins have full access to stock opening"
ON public.stock_opening FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to stock opening items"
ON public.stock_opening_items FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to stock adjustments"
ON public.stock_adjustments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to stock adjustment items"
ON public.stock_adjustment_items FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to stock opname"
ON public.stock_opname FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to stock opname items"
ON public.stock_opname_items FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Discounts: Admin full access
CREATE POLICY "Admins have full access to discounts"
ON public.discounts FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to discount products"
ON public.discount_products FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Banners: Admin full access
CREATE POLICY "Admins have full access to banners"
ON public.banners FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- News: Admin full access
CREATE POLICY "Admins have full access to news posts"
ON public.news_posts FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Rental Orders: Admin can view all
CREATE POLICY "Admins can view all rental orders"
ON public.rental_orders FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update rental orders"
ON public.rental_orders FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Dressing Room Categories: Admin full access
CREATE POLICY "Admins have full access to dressing room categories"
ON public.dressing_room_categories FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- User Roles: Admin can view
CREATE POLICY "Admins can view user role assignments"
ON public.user_role_assignments FOR SELECT
TO authenticated
USING (public.is_admin());

-- Audit Logs: Admin read only
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- Divisions: Admin full access
CREATE POLICY "Admins have full access to divisions"
ON public.divisions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to admin divisions"
ON public.admin_divisions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- App Configs: Admin can update
CREATE POLICY "Admins can update app configs"
ON public.app_configs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================
-- GRANT USAGE
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled and basic policies created!';
  RAISE NOTICE '📊 Public can view: products, categories, tickets, banners';
  RAISE NOTICE '🔒 Users can manage: their own orders, tickets, profiles';
  RAISE NOTICE '👨‍💼 Admins have full access to all tables';
END $$;
