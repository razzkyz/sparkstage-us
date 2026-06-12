-- Add bulk import stock opname function

CREATE OR REPLACE FUNCTION public.bulk_import_stock_opname(
  p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_opname_id BIGINT;
  v_user_id UUID;
  v_product_id BIGINT;
  v_variant_id BIGINT;
  v_quantity_before INTEGER;
  v_quantity_after INTEGER;
  v_quantity_change INTEGER;
  v_total_imported INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_error_message TEXT;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to import stock opname';
  END IF;

  v_user_id := auth.uid();

  -- Validate input
  IF p_data IS NULL OR jsonb_array_length(p_data) = 0 THEN
    RAISE EXCEPTION 'Import data cannot be empty';
  END IF;

  -- Process each row
  FOR v_item IN SELECT jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- Extract data from import
      v_product_id := (v_item->>'product_id')::BIGINT;
      v_variant_id := (v_item->>'variant_id')::BIGINT;
      v_quantity_change := (v_item->>'quantity_change')::INTEGER;

      IF v_product_id IS NULL OR v_variant_id IS NULL OR v_quantity_change IS NULL THEN
        v_total_errors := v_total_errors + 1;
        CONTINUE;
      END IF;

      -- Get current stock
      SELECT stock
      INTO v_quantity_before
      FROM public.product_variants
      WHERE id = v_variant_id AND is_active = TRUE;

      IF v_quantity_before IS NULL THEN
        v_total_errors := v_total_errors + 1;
        CONTINUE;
      END IF;

      v_quantity_after := v_quantity_before + v_quantity_change;

      IF v_quantity_after < 0 THEN
        v_total_errors := v_total_errors + 1;
        CONTINUE;
      END IF;

      -- Create opname header if not exists
      IF v_opname_id IS NULL THEN
        INSERT INTO public.stock_opname (
          location,
          transaction_date,
          transaction_type,
          reason,
          notes,
          created_by
        ) VALUES (
          COALESCE((v_item->>'location'), 'SparkStage55'),
          NOW(),
          COALESCE((v_item->>'transaction_type'), 'adjustment'),
          'Bulk Import',
          'Imported from XLSX',
          v_user_id
        )
        RETURNING id INTO v_opname_id;
      END IF;

      -- Insert item
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
        v_quantity_before,
        v_quantity_change,
        v_quantity_after,
        COALESCE((v_item->>'unit'), 'pcs'),
        (v_item->>'cost_per_unit')::NUMERIC
      );

      -- Update variant stock
      UPDATE public.product_variants
      SET 
        stock = v_quantity_after,
        updated_at = NOW()
      WHERE id = v_variant_id;

      v_total_imported := v_total_imported + 1;

    EXCEPTION WHEN OTHERS THEN
      v_total_errors := v_total_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'opname_id', v_opname_id,
    'total_imported', v_total_imported,
    'total_errors', v_total_errors,
    'message', v_total_imported || ' item berhasil diimport, ' || v_total_errors || ' item gagal'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_import_stock_opname(JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
