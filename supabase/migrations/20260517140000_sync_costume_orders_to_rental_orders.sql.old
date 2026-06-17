-- When a product order containing a "dressing room" category item is paid,
-- auto-sync it into rental_orders so the admin can track laundry/return there too.

-- 1. Add source column to distinguish formal rentals from auto-synced costume orders
ALTER TABLE public.rental_orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'formal'
  CONSTRAINT rental_orders_source_check CHECK (source IN ('formal', 'costume_harian'));

COMMENT ON COLUMN public.rental_orders.source IS
  'formal = manual rental order; costume_harian = auto-synced from product order (dressing room category)';

-- Also store a reference back to the originating product order
ALTER TABLE public.rental_orders
  ADD COLUMN IF NOT EXISTS source_order_product_id bigint
  REFERENCES public.order_products(id) ON DELETE SET NULL;

-- 2. Trigger function: fires after order_products payment_status → 'paid'
CREATE OR REPLACE FUNCTION public.sync_costume_order_to_rental_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item         RECORD;
  v_profile      RECORD;
  v_rental_id    BIGINT;
  v_has_dressing BOOLEAN;
  v_start_time   TIMESTAMPTZ;
BEGIN
  -- Only act when payment_status flips TO 'paid'
  IF NEW.payment_status IS DISTINCT FROM 'paid'
     OR OLD.payment_status = 'paid' THEN
    RETURN NEW;
  END IF;

  -- Check if order already synced (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.rental_orders
    WHERE source_order_product_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Check for at least one dressing-room-category item
  SELECT EXISTS (
    SELECT 1
    FROM public.order_product_items opi
    JOIN public.product_variants pv ON pv.id = opi.product_variant_id
    JOIN public.products p          ON p.id  = pv.product_id
    JOIN public.categories c        ON c.id  = p.category_id
    WHERE opi.order_product_id = NEW.id
      AND lower(c.name) LIKE '%dressing%'
  ) INTO v_has_dressing;

  IF NOT v_has_dressing THEN
    RETURN NEW;
  END IF;

  -- Fetch customer profile
  SELECT name, email
  INTO v_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  v_start_time := COALESCE(NEW.paid_at, NEW.created_at, now());

  -- Insert rental_orders header
  INSERT INTO public.rental_orders (
    order_number,
    user_id,
    duration_days,
    rental_start_time,
    rental_end_time,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    subtotal,
    deposit_amount,
    total,
    status,
    payment_status,
    source,
    source_order_product_id,
    late_fee_amount,
    damage_fee_amount,
    refund_amount,
    refund_processed,
    created_at,
    updated_at
  ) VALUES (
    NEW.order_number,
    NEW.user_id,
    0,                                               -- same-day session (0 days)
    v_start_time,
    v_start_time + INTERVAL '150 minutes',           -- 2.5-hour session window
    COALESCE(v_profile.name, 'Customer'),
    COALESCE(v_profile.email, ''),
    '',                                              -- phone not in product orders
    NULL,                                            -- address not required
    NEW.total,
    0,                                               -- no deposit for costume harian
    NEW.total,
    'active',
    'paid',
    'costume_harian',
    NEW.id,
    0, 0, 0, false,
    COALESCE(NEW.created_at, now()),
    now()
  )
  RETURNING id INTO v_rental_id;

  -- Insert rental_order_items for each dressing-room item
  FOR v_item IN
    SELECT
      opi.product_variant_id,
      COALESCE(p.name, 'Costume') AS product_name,
      opi.quantity,
      opi.price   AS daily_rate,
      0           AS item_deposit_amount,
      opi.subtotal AS total_rental_cost
    FROM public.order_product_items opi
    JOIN public.product_variants pv ON pv.id = opi.product_variant_id
    JOIN public.products p          ON p.id  = pv.product_id
    JOIN public.categories c        ON c.id  = p.category_id
    WHERE opi.order_product_id = NEW.id
      AND lower(c.name) LIKE '%dressing%'
  LOOP
    INSERT INTO public.rental_order_items (
      rental_order_id,
      product_variant_id,
      product_name,
      quantity,
      daily_rate,
      item_deposit_amount,
      total_rental_cost
    ) VALUES (
      v_rental_id,
      v_item.product_variant_id,
      v_item.product_name,
      v_item.quantity,
      v_item.daily_rate,
      v_item.item_deposit_amount,
      v_item.total_rental_cost
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to order_products
DROP TRIGGER IF EXISTS trg_sync_costume_to_rental ON public.order_products;
CREATE TRIGGER trg_sync_costume_to_rental
  AFTER UPDATE OF payment_status ON public.order_products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_costume_order_to_rental_orders();
