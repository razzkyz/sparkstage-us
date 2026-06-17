-- Update create_stock_opname RPC to accept new item structure
-- Items now use: quantity_before, quantity_actual, discrepancy_reason instead of quantity_change

-- ============================================
-- Update RPC: create_stock_opname with new item structure
-- ============================================
CREATE OR REPLACE FUNCTION public.create_stock_opname(
  p_location TEXT,
  p_transaction_date TIMESTAMPTZ,
  p_transaction_type TEXT,
  p_reason TEXT,
  p_notes TEXT,
  p_opname_start_date TIMESTAMPTZ,
  p_opname_end_date TIMESTAMPTZ,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname_id BIGINT;
  v_opname_number TEXT;
  v_item JSONB;
  v_variant_id BIGINT;
  v_product_id BIGINT;
  v_quantity_before INTEGER;
  v_quantity_actual INTEGER;
  v_discrepancy_reason TEXT;
  v_unit TEXT;
  v_cost_per_unit NUMERIC(10, 2);
  v_items_processed INTEGER := 0;
BEGIN
  -- Authorization check: only admin or kasir can create stock opname
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to create stock opname';
  END IF;

  -- Validate transaction type
  IF p_transaction_type NOT IN ('stock_in', 'stock_out', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Stock opname must have at least one item';
  END IF;

  -- Validate period dates
  IF p_opname_start_date IS NULL OR p_opname_end_date IS NULL THEN
    RAISE EXCEPTION 'opname_start_date and opname_end_date are required';
  END IF;

  -- Create stock opname header
  INSERT INTO public.stock_opname (
    location,
    transaction_date,
    transaction_type,
    reason,
    notes,
    opname_start_date,
    opname_end_date,
    created_by
  ) VALUES (
    COALESCE(p_location, 'SparkStage55'),
    COALESCE(p_transaction_date, NOW()),
    p_transaction_type,
    p_reason,
    p_notes,
    COALESCE(p_opname_start_date, NOW() - INTERVAL '1 day'),
    COALESCE(p_opname_end_date, NOW()),
    auth.uid()
  )
  RETURNING id, opname_number INTO v_opname_id, v_opname_number;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::BIGINT;
    v_quantity_before := (v_item->>'quantity_before')::INTEGER;
    v_quantity_actual := (v_item->>'quantity_actual')::INTEGER;
    v_discrepancy_reason := (v_item->>'discrepancy_reason')::TEXT;
    v_unit := COALESCE((v_item->>'unit')::TEXT, 'pcs');
    v_cost_per_unit := (v_item->>'cost_per_unit')::NUMERIC(10, 2);

    IF v_variant_id IS NULL OR v_quantity_before IS NULL THEN
      RAISE EXCEPTION 'Invalid item data: variant_id and quantity_before are required';
    END IF;

    -- Get product_id and validate variant exists
    SELECT product_id
    INTO v_product_id
    FROM public.product_variants
    WHERE id = v_variant_id
      AND is_active = TRUE;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Product variant % not found or inactive', v_variant_id;
    END IF;

    -- Insert stock opname item
    -- Trigger will auto-calculate: quantity_sold, quantity_expected, quantity_discrepancy
    INSERT INTO public.stock_opname_items (
      stock_opname_id,
      product_id,
      variant_id,
      quantity_before,
      quantity_actual,
      unit,
      cost_per_unit,
      discrepancy_reason
    ) VALUES (
      v_opname_id,
      v_product_id,
      v_variant_id,
      v_quantity_before,
      v_quantity_actual,
      v_unit,
      v_cost_per_unit,
      v_discrepancy_reason
    );

    v_items_processed := v_items_processed + 1;
  END LOOP;

  -- Return success response
  RETURN jsonb_build_object(
    'opname_id', v_opname_id,
    'opname_number', v_opname_number,
    'items_processed', v_items_processed
  );
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
