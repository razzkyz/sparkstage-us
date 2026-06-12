-- Migration: Add detailed return status for rental items (Dressing Room)
-- Add item_status and reject_photo_url columns

ALTER TABLE public.rental_order_items
  ADD COLUMN IF NOT EXISTS item_status varchar(50) NOT NULL DEFAULT 'rented'
  CONSTRAINT rental_order_items_status_check CHECK (item_status IN ('rented', 'returned', 'laundry', 'rejected'));

ALTER TABLE public.rental_order_items
  ADD COLUMN IF NOT EXISTS reject_photo_url text;

COMMENT ON COLUMN public.rental_order_items.item_status IS 'Status of individual item in a rental order';
COMMENT ON COLUMN public.rental_order_items.reject_photo_url IS 'Photo evidence if the item is rejected/damaged';
