-- Add deposit field to product_variants table
-- This allows each product variant to have a different deposit amount

alter table public.product_variants
  add column if not exists deposit_amount numeric default null;

-- Add comment
comment on column public.product_variants.deposit_amount is 'Deposit amount for rental items. If null, defaults to 75% of price.';

-- Create index for faster queries
create index if not exists idx_product_variants_deposit on public.product_variants(deposit_amount) where deposit_amount is not null;
