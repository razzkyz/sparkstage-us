-- Fix exchange rate from 15500 to 18000
-- Multiply existing USD prices by 15500 to get original IDR, then divide by 18000
UPDATE product_variants
SET price = ROUND((price * 15500.0) / 18000.0, 2);

UPDATE product_retail
SET price = ROUND((price * 15500.0) / 18000.0, 2);
