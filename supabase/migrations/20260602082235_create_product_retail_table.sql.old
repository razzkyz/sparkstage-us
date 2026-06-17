-- Membuat tabel product_retail
CREATE TABLE product_retail (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(12, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL,
  length INTEGER,
  width INTEGER,
  height INTEGER,
  image VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk mempercepat filter/join berdasarkan kategori
CREATE INDEX idx_product_retail_category_id ON public.product_retail(category_id);

-- Membuat fungsi otomatisasi untuk updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Memasang trigger pada tabel product_retail
CREATE TRIGGER set_product_retail_updated_at
BEFORE UPDATE ON product_retail
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
