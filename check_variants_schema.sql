-- Check product_variants structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY ordinal_position;
