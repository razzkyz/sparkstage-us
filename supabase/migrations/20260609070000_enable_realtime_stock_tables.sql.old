-- ============================================
-- Enable Realtime for Stock Management Tables
-- Date: 2026-06-09
-- Description: Enable Supabase Realtime for stock_openings, stock_adjustments, and stock_opnames
-- ============================================

-- Enable realtime for stock_openings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_openings;

-- Enable realtime for stock_adjustments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_adjustments;

-- Enable realtime for stock_opnames table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_opnames;

-- Grant realtime to authenticated users (read-only broadcast)
GRANT SELECT ON public.stock_openings TO authenticated;
GRANT SELECT ON public.stock_adjustments TO authenticated;
GRANT SELECT ON public.stock_opnames TO authenticated;

COMMENT ON TABLE public.stock_openings IS 'Daily stock opening records (stock awal) - REALTIME ENABLED';
COMMENT ON TABLE public.stock_adjustments IS 'Stock adjustments for gifts, KOL marketing, losses, and other manual changes - REALTIME ENABLED';
COMMENT ON TABLE public.stock_opnames IS 'Stock taking records with physical counts and variance analysis - REALTIME ENABLED';
