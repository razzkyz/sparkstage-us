-- ============================================================
-- Migration: Rename legacy rental_orders columns to new schema
-- Date: 2026-06-03
-- Problem: First migration (20260430000001) created table with old column
--          names (rental_start_time, subtotal, deposit_amount, total).
--          Second migration (20260430000007) used IF NOT EXISTS so the
--          new columns (start_time, total_rental_cost, etc.) were never
--          added. Edge Function fails because it tries to INSERT into
--          the new column names that don't exist.
-- Solution: Rename old columns → new names, add missing ones.
-- Safe: Uses DO block with column existence checks.
-- ============================================================

DO $$
BEGIN

  -- 1. Rename rental_start_time → start_time (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'rental_start_time'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN rental_start_time TO start_time;
  END IF;

  -- 2. Rename rental_end_time → end_time (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'rental_end_time'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN rental_end_time TO end_time;
  END IF;

  -- 3. Rename subtotal → total_rental_cost (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'subtotal'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN subtotal TO total_rental_cost;
  END IF;

  -- 4. Rename deposit_amount → total_deposit (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'deposit_amount'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN deposit_amount TO total_deposit;
  END IF;

  -- 5. Rename total → total_amount (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'total'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN total TO total_amount;
  END IF;

  -- 6. Rename late_fee_amount → late_fee (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'late_fee_amount'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN late_fee_amount TO late_fee;
  END IF;

  -- 7. Rename damage_fee_amount → damage_deduction (if old column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_orders'
      AND column_name  = 'damage_fee_amount'
  ) THEN
    ALTER TABLE public.rental_orders
      RENAME COLUMN damage_fee_amount TO damage_deduction;
  END IF;

END $$;

-- 8. Ensure all required columns exist (add if missing)
ALTER TABLE public.rental_orders
  ADD COLUMN IF NOT EXISTS start_time         TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_time           TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS total_rental_cost  BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deposit      BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount       BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee           BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS damage_deduction   BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_data       JSONB   DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS payment_url        TEXT,
  ADD COLUMN IF NOT EXISTS payment_expired_at TIMESTAMP WITH TIME ZONE;

-- 9. Backfill start_time / end_time from rental_start_time if still null
--    (handles the case where the rename didn't happen because new cols were added by migration 007)
UPDATE public.rental_orders
SET start_time = created_at
WHERE start_time IS NULL;

UPDATE public.rental_orders
SET end_time = created_at + ((COALESCE(duration_days, 1)) * INTERVAL '1 day')
WHERE end_time IS NULL;

-- 10. Now make start_time / end_time NOT NULL (safe after backfill)
ALTER TABLE public.rental_orders
  ALTER COLUMN start_time SET NOT NULL,
  ALTER COLUMN end_time   SET NOT NULL;
