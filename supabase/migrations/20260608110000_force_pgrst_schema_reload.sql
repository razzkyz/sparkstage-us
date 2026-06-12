-- Force PostgREST schema cache reload
-- This ensures get_stock_opname_list and related functions are available

NOTIFY pgrst, 'reload schema';
