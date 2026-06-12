-- Add sample stock opname data for testing

-- Get a user ID to use as created_by (first admin user)
DO $$
DECLARE
  v_user_id UUID;
  v_product_id BIGINT;
  v_variant_id BIGINT;
  v_opname_id BIGINT;
BEGIN
  -- Get the first user from auth.users
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found in auth.users table';
    RETURN;
  END IF;

  -- Get first product and variant
  SELECT p.id INTO v_product_id
  FROM public.products p
  WHERE p.deleted_at IS NULL
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'No active products found';
    RETURN;
  END IF;

  SELECT pv.id INTO v_variant_id
  FROM public.product_variants pv
  WHERE pv.product_id = v_product_id AND pv.is_active = TRUE
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    RAISE NOTICE 'No active variants found for product %', v_product_id;
    RETURN;
  END IF;

  -- Insert sample stock opname
  INSERT INTO public.stock_opname (
    opname_number,
    location,
    transaction_date,
    transaction_type,
    reason,
    notes,
    created_by
  ) VALUES (
    '#sop-00001',
    'SparkStage55',
    NOW() - INTERVAL '2 days',
    'adjustment',
    'Koreksi stok fisik',
    'Hasil stock opname bulan ini',
    v_user_id
  )
  RETURNING id INTO v_opname_id;

  -- Insert sample stock opname items
  INSERT INTO public.stock_opname_items (
    stock_opname_id,
    product_id,
    variant_id,
    quantity_before,
    quantity_change,
    quantity_after,
    unit,
    cost_per_unit
  ) VALUES (
    v_opname_id,
    v_product_id,
    v_variant_id,
    50,
    -5,
    45,
    'pcs',
    10000
  );

  RAISE NOTICE 'Sample stock opname created with ID: %', v_opname_id;
END $$;

-- Add another sample record
DO $$
DECLARE
  v_user_id UUID;
  v_product_id BIGINT;
  v_variant_id BIGINT;
  v_opname_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found';
    RETURN;
  END IF;

  SELECT p.id INTO v_product_id
  FROM public.products p
  WHERE p.deleted_at IS NULL
  LIMIT 1 OFFSET 1;

  IF v_product_id IS NULL THEN
    SELECT p.id INTO v_product_id
    FROM public.products p
    WHERE p.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'No products found';
    RETURN;
  END IF;

  SELECT pv.id INTO v_variant_id
  FROM public.product_variants pv
  WHERE pv.product_id = v_product_id AND pv.is_active = TRUE
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    RAISE NOTICE 'No variants found';
    RETURN;
  END IF;

  INSERT INTO public.stock_opname (
    opname_number,
    location,
    transaction_date,
    transaction_type,
    reason,
    notes,
    created_by
  ) VALUES (
    '#sop-00002',
    'SparkStage55',
    NOW() - INTERVAL '1 day',
    'stock_in',
    'Pembelian barang',
    'Barang dari supplier',
    v_user_id
  )
  RETURNING id INTO v_opname_id;

  INSERT INTO public.stock_opname_items (
    stock_opname_id,
    product_id,
    variant_id,
    quantity_before,
    quantity_change,
    quantity_after,
    unit,
    cost_per_unit
  ) VALUES (
    v_opname_id,
    v_product_id,
    v_variant_id,
    30,
    20,
    50,
    'pcs',
    12000
  );

  RAISE NOTICE 'Second sample stock opname created';
END $$;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
