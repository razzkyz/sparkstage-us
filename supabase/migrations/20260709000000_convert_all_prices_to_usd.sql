-- Convert product_variants prices from IDR to USD
UPDATE product_variants
SET price = ROUND(price / 15500.0, 2)
WHERE price > 1000;

-- Convert product_retail prices from IDR to USD
UPDATE product_retail
SET price = ROUND(price / 15500.0, 2)
WHERE price > 1000;
