-- ============================================================
-- BACKFILL LOYALTY POINTS — Jalankan di Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor
-- ============================================================
-- Script ini AMAN dijalankan berkali-kali (idempotent).
-- Hanya memproses order yang BELUM ada di riwayat poin.
-- ============================================================

DO $$
DECLARE
  v_order         RECORD;
  v_total_qty     BIGINT;
  v_points_award  BIGINT;
  v_ticket_count  INTEGER := 0;
  v_product_count INTEGER := 0;
BEGIN

  -- --------------------------------------------------------
  -- PART 1: Ticket orders (status = 'paid' atau 'completed')
  -- --------------------------------------------------------
  FOR v_order IN
    SELECT
      o.id,
      o.order_number,
      o.user_id,
      COALESCE(SUM(oi.quantity), 0) AS total_qty
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE
      o.status IN ('paid', 'completed')
      AND o.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.loyalty_points_history lph
        WHERE lph.order_id = o.id
          AND lph.points_change > 0
      )
    GROUP BY o.id, o.order_number, o.user_id
    HAVING COALESCE(SUM(oi.quantity), 0) > 0
  LOOP
    v_points_award := v_order.total_qty * 20;

    INSERT INTO public.customer_loyalty_points (user_id, total_points, updated_at)
    VALUES (v_order.user_id, v_points_award, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET total_points = customer_loyalty_points.total_points + v_points_award,
          updated_at   = NOW();

    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id, created_at)
    VALUES (
      v_order.user_id,
      v_points_award,
      'Backfill: Ticket purchase reward (' || v_order.total_qty || ' tiket)',
      v_order.id,
      NOW()
    );

    v_ticket_count := v_ticket_count + 1;
    RAISE NOTICE 'Ticket order %: awarded % pts to user %',
      v_order.order_number, v_points_award, v_order.user_id;
  END LOOP;

  -- --------------------------------------------------------
  -- PART 2: Product & Rental orders (payment_status = 'paid')
  -- --------------------------------------------------------
  FOR v_order IN
    SELECT
      op.id,
      op.order_number,
      op.user_id,
      COALESCE(SUM(opi.quantity), 0) AS total_qty
    FROM public.order_products op
    JOIN public.order_product_items opi ON opi.order_product_id = op.id
    WHERE
      op.payment_status = 'paid'
      AND op.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.loyalty_points_history lph
        WHERE lph.user_id = op.user_id
          AND lph.reason LIKE '%' || op.order_number || '%'
          AND lph.points_change > 0
      )
    GROUP BY op.id, op.order_number, op.user_id
    HAVING COALESCE(SUM(opi.quantity), 0) > 0
  LOOP
    v_points_award := v_order.total_qty * 20;

    INSERT INTO public.customer_loyalty_points (user_id, total_points, updated_at)
    VALUES (v_order.user_id, v_points_award, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET total_points = customer_loyalty_points.total_points + v_points_award,
          updated_at   = NOW();

    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id, created_at)
    VALUES (
      v_order.user_id,
      v_points_award,
      'Backfill: Product/rental purchase reward (' || v_order.total_qty || ' item) - ' || v_order.order_number,
      NULL,
      NOW()
    );

    v_product_count := v_product_count + 1;
    RAISE NOTICE 'Product order %: awarded % pts to user %',
      v_order.order_number, v_points_award, v_order.user_id;
  END LOOP;

  RAISE NOTICE '=== Backfill Complete ===';
  RAISE NOTICE 'Ticket orders processed : %', v_ticket_count;
  RAISE NOTICE 'Product orders processed: %', v_product_count;

END $$;
