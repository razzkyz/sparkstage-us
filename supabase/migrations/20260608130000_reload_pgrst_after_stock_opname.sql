-- Force PostgREST schema cache reload after creating stock opname tables
NOTIFY pgrst, 'reload schema';
