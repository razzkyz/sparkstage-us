-- Create trigger to calculate stock opname quantities automatically
-- This trigger ensures quantity_sold, quantity_expected, and quantity_discrepancy are calculated

DROP TRIGGER IF EXISTS trigger_calculate_stock_opname_quantities ON public.stock_opname_items;

CREATE TRIGGER trigger_calculate_stock_opname_quantities
  BEFORE INSERT OR UPDATE ON public.stock_opname_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_stock_opname_quantities();

-- Create/update the report view for easy stock opname reporting
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

GRANT SELECT ON public.stock_opname_report TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
