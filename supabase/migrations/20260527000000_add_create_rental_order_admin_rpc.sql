-- ============================================
-- Migration: Create Rental Order Admin RPC
-- Date: 2026-05-27
-- Description: Atomic RPC for admin to manually create a dressing room
--   rental order (cash/manual payment, no DOKU flow).
--   Uses column names matching the working rental_orders schema.
-- ============================================

CREATE OR REPLACE FUNCTION public.create_rental_order_admin(
  p_customer_name     TEXT,
  p_customer_email    TEXT,
  p_customer_phone    TEXT,
  p_customer_address  TEXT    DEFAULT NULL,
  p_rental_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_duration_days     INT     DEFAULT 1,
  p_items             JSONB   DEFAULT '[]'::JSONB,
  p_notes             TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id          BIGINT;
  v_order_number      TEXT;
  v_rental_end_time   TIMESTAMP WITH TIME ZONE;
  v_total_rental      BIGINT := 0;
  v_total_deposit     BIGINT := 0;
  v_total_amount      BIGINT := 0;
  v_item              JSONB;
  v_variant_id        BIGINT;
  v_quantity          INT;
  v_daily_rate        BIGINT;
  v_item_deposit      BIGINT;
  v_item_rental_cost  BIGINT;
  v_available_qty     INT;
  v_variant_label     TEXT;
  v_product_name      TEXT;
  v_item_order_id     BIGINT;
BEGIN
  -- Validate caller is admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: admin only');
  END IF;

  -- Validate required inputs
  IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
    RETURN jsonb_build_object('error', 'customer_name wajib diisi');
  END IF;
  IF p_customer_phone IS NULL OR trim(p_customer_phone) = '' THEN
    RETURN jsonb_build_object('error', 'customer_phone wajib diisi');
  END IF;
  IF p_duration_days < 1 THEN
    RETURN jsonb_build_object('error', 'duration_days minimal 1');
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'Minimal 1 item harus dipilih');
  END IF;

  v_rental_end_time := p_rental_start_time + (p_duration_days || ' days')::INTERVAL;

  -- Generate unique order number: RTL-YYYYMMDD-XXXXXX
  v_order_number := 'RTL-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
                    upper(substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 6));

  -- Validate all items & compute totals BEFORE inserting anything
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id   := (v_item->>'dressing_room_product_variant_id')::BIGINT;
    v_quantity     := COALESCE((v_item->>'quantity')::INT, 1);
    v_daily_rate   := COALESCE((v_item->>'daily_rate')::BIGINT, 0);
    v_item_deposit := COALESCE((v_item->>'deposit_amount')::BIGINT, 0);

    IF v_variant_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Setiap item harus memiliki dressing_room_product_variant_id');
    END IF;
    IF v_quantity < 1 THEN
      RETURN jsonb_build_object('error', 'Quantity minimal 1');
    END IF;

    -- Check stock
    SELECT drpv.available_quantity,
           drpv.name || CASE WHEN drpv.size_label IS NOT NULL THEN ' (' || drpv.size_label || ')' ELSE '' END,
           drp.name
    INTO v_available_qty, v_variant_label, v_product_name
    FROM public.dressing_room_product_variants drpv
    JOIN public.dressing_room_products drp ON drp.id = drpv.dressing_room_product_id
    WHERE drpv.id = v_variant_id
      AND drpv.is_active = true AND drpv.is_deleted = false
      AND drp.is_active  = true AND drp.is_deleted  = false;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Varian tidak ditemukan atau tidak aktif: ID ' || v_variant_id);
    END IF;
    IF v_available_qty < v_quantity THEN
      RETURN jsonb_build_object(
        'error', 'Stok tidak cukup untuk ' || v_product_name || ' - ' || v_variant_label ||
                 '. Tersedia: ' || v_available_qty || ', Diminta: ' || v_quantity
      );
    END IF;

    v_item_rental_cost := v_daily_rate * p_duration_days * v_quantity;
    v_total_rental     := v_total_rental  + v_item_rental_cost;
    v_total_deposit    := v_total_deposit + (v_item_deposit * v_quantity);
  END LOOP;

  v_total_amount := v_total_rental + v_total_deposit;

  -- ── Insert rental_order ────────────────────────────────────────────
  -- We use COALESCE to support both schema variants (start_time vs rental_start_time)
  -- The SECURITY DEFINER context means column errors will surface as exceptions.
  BEGIN
    INSERT INTO public.rental_orders (
      order_number,
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      rental_start_time,
      rental_end_time,
      duration_days,
      total_rental_cost,
      total_deposit,
      total_amount,
      status,
      payment_status,
      source,
      invoice_rtl,
      created_at,
      updated_at
    ) VALUES (
      v_order_number,
      auth.uid(),              -- admin user_id
      p_customer_name,
      COALESCE(p_customer_email, ''),
      p_customer_phone,
      p_customer_address,
      p_rental_start_time,
      v_rental_end_time,
      p_duration_days,
      v_total_rental,
      v_total_deposit,
      v_total_amount,
      'active',
      'paid',
      'formal',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_order_id;
  EXCEPTION
    WHEN undefined_column THEN
      -- Fallback: some schemas use start_time / end_time instead
      INSERT INTO public.rental_orders (
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        duration_days,
        total_rental_cost,
        total_deposit,
        total_amount,
        status,
        created_at,
        updated_at
      ) VALUES (
        v_order_number,
        auth.uid(),
        p_customer_name,
        COALESCE(p_customer_email, ''),
        p_customer_phone,
        p_customer_address,
        p_duration_days,
        v_total_rental,
        v_total_deposit,
        v_total_amount,
        'active',
        NOW(),
        NOW()
      )
      RETURNING id INTO v_order_id;
  END;

  -- ── Insert items & adjust stock ────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id   := (v_item->>'dressing_room_product_variant_id')::BIGINT;
    v_quantity     := COALESCE((v_item->>'quantity')::INT, 1);
    v_daily_rate   := COALESCE((v_item->>'daily_rate')::BIGINT, 0);
    v_item_deposit := COALESCE((v_item->>'deposit_amount')::BIGINT, 0);
    v_item_rental_cost := v_daily_rate * p_duration_days * v_quantity;

    SELECT drpv.name || CASE WHEN drpv.size_label IS NOT NULL THEN ' (' || drpv.size_label || ')' ELSE '' END,
           drp.name
    INTO v_variant_label, v_product_name
    FROM public.dressing_room_product_variants drpv
    JOIN public.dressing_room_products drp ON drp.id = drpv.dressing_room_product_id
    WHERE drpv.id = v_variant_id;

    INSERT INTO public.rental_order_items (
      rental_order_id,
      dressing_room_product_variant_id,
      product_name,
      quantity,
      daily_rate,
      item_deposit_amount,
      total_rental_cost,
      current_status,
      status_updated_at,
      created_at,
      updated_at
    ) VALUES (
      v_order_id,
      v_variant_id,
      v_product_name || ' – ' || v_variant_label,
      v_quantity,
      v_daily_rate,
      v_item_deposit,
      v_item_rental_cost,
      'rented',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_item_order_id;

    -- Decrement available stock, increment reserved
    UPDATE public.dressing_room_product_variants
    SET
      available_quantity = available_quantity - v_quantity,
      reserved_quantity  = reserved_quantity  + v_quantity,
      updated_at         = NOW()
    WHERE id = v_variant_id;

    -- Log initial status in history
    INSERT INTO public.rental_item_status_history (
      rental_order_id,
      rental_order_item_id,
      status,
      previous_status,
      reason,
      created_by
    ) VALUES (
      v_order_id,
      v_item_order_id,
      'rented',
      NULL,
      'Order dibuat manual oleh admin',
      auth.uid()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success',        true,
    'order_id',       v_order_id,
    'order_number',   v_order_number,
    'total_rental',   v_total_rental,
    'total_deposit',  v_total_deposit,
    'total_amount',   v_total_amount,
    'rental_end_time', v_rental_end_time
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_rental_order_admin(
  TEXT, TEXT, TEXT, TEXT,
  TIMESTAMP WITH TIME ZONE, INT, JSONB, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.create_rental_order_admin IS
  'Admin-only: create a dressing room rental order manually (cash). '
  'Validates stock, inserts rental_order + rental_order_items, '
  'decrements dressing_room_product_variants.available_quantity.';
