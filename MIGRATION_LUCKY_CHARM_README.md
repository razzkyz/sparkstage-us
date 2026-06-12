# Migration Guide: Lucky Charm Products → Retail E-Commerce

## 📋 Overview

Script ini membantu migrasi data produk dari tabel `products` (lama) ke tabel `product_retail` (baru) untuk persiapan sistem e-commerce. Khusus untuk produk dengan kategori **Lucky Charm**.

## 🎯 Tujuan

Memindahkan data produk Lucky Charm dari struktur tabel lama (yang menggunakan `products` + `product_variants`) ke struktur tabel baru `product_retail` yang lebih sederhana dan siap untuk e-commerce.

---

## 📊 Perbedaan Struktur Tabel

### Tabel `products` (Lama)
- Product sebagai parent, detail ada di `product_variants`
- Price, stock, weight ada di tabel `product_variants` (many-to-one)
- Satu product bisa punya banyak variants (warna, size, dll)

### Tabel `product_retail` (Baru)
- Product standalone dengan semua detail di 1 row
- Price, stock, weight langsung ada di tabel ini
- Tidak ada konsep variant, setiap variant jadi product terpisah

| Field        | products (old)     | product_retail (new) | Notes |
|--------------|-------------------|---------------------|-------|
| id           | BIGSERIAL         | BIGINT (IDENTITY)   | Auto increment |
| name         | TEXT              | VARCHAR(255)        | Nama produk |
| slug         | TEXT (unique)     | VARCHAR(255) (unique) | URL-friendly name |
| description  | TEXT              | TEXT                | Deskripsi lengkap |
| category_id  | BIGINT (FK)       | BIGINT (FK)         | Link ke categories |
| **price**    | ❌ (di variants)  | ✅ NUMERIC(12,2)    | **Harus mapping!** |
| **stock**    | ❌ (di variants)  | ✅ INTEGER          | **Harus mapping!** |
| **weight**   | ❌ (di variants)  | ✅ INTEGER          | **Harus mapping!** (gram) |
| **length**   | ❌                | ✅ INTEGER          | Tidak ada di old (NULL) |
| **width**    | ❌                | ✅ INTEGER          | Tidak ada di old (NULL) |
| **height**   | ❌                | ✅ INTEGER          | Tidak ada di old (NULL) |
| image        | image_url (TEXT)  | image (VARCHAR 255) | URL gambar |
| is_active    | BOOLEAN           | BOOLEAN             | Status aktif |
| created_at   | TIMESTAMPTZ       | TIMESTAMPTZ         | Tanggal dibuat |
| updated_at   | TIMESTAMPTZ       | TIMESTAMPTZ         | Tanggal diupdate |

---

## 🚀 Cara Penggunaan

### Pre-requisites

1. Pastikan tabel `product_retail` sudah dibuat (migration `20260602082235_create_product_retail_table.sql`)
2. Pastikan kategori "Lucky Charm" sudah ada di tabel `categories`
3. Backup database sebelum melakukan migrasi!

```sql
-- Backup (jika perlu)
pg_dump -U postgres -d your_database -t product_retail > backup_product_retail.sql
```

---

### Step 1: Preview Data

Uncomment bagian STEP 1 di script untuk melihat data yang akan dimigrate:

```sql
SELECT 
  p.id as product_id,
  p.name,
  p.slug,
  c.name as category_name,
  COUNT(pv.id) as total_variants,
  MAX(pv.price) as max_price,
  MIN(pv.price) as min_price,
  SUM(pv.stock) as total_stock
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
GROUP BY p.id, p.name, p.slug, c.name
ORDER BY p.id;
```

**Output Example:**
```
product_id | name                    | category_name | total_variants | max_price | min_price | total_stock
-----------|-------------------------|---------------|----------------|-----------|-----------|------------
42         | Crystal Lucky Bracelet  | Lucky Charm   | 3              | 150000    | 120000    | 45
43         | Fortune Coin Necklace   | Lucky Charm   | 2              | 200000    | 180000    | 20
```

---

### Step 2: Pilih Strategi Migrasi

Ada **3 opsi** strategi migrasi. Pilih salah satu yang sesuai:

#### ✅ **OPSI 1: Harga Tertinggi** (Recommended)
Ambil 1 variant dengan **harga tertinggi** untuk represent setiap product.

**Cocok untuk:** Product yang variantnya mirip, ingin display yang paling premium.

**Contoh:**
- Product: "Crystal Bracelet" punya 3 variants (Rp 120k, Rp 135k, Rp 150k)
- Hasil: 1 row di `product_retail` dengan price Rp 150k

Uncomment **STEP 2A** di script.

---

#### ✅ **OPSI 2: Total Stock** (Aggregate)
Aggregate semua variants jadi 1 product dengan **total stock** dan **harga tertinggi**.

**Cocok untuk:** Product yang variant tidak terlalu berbeda, ingin gabungkan stock.

**Contoh:**
- Product: "Crystal Bracelet" punya 3 variants (stock: 10, 15, 20)
- Hasil: 1 row dengan total stock = 45

Uncomment **STEP 2B** di script.

---

#### ✅ **OPSI 3: Setiap Variant = Product** (Default in Script)
Setiap variant jadi **product terpisah** di `product_retail`.

**Cocok untuk:** Setiap variant punya perbedaan signifikan (warna, size, bahan berbeda).

**Contoh:**
- Product: "Crystal Bracelet" punya 3 variants (Gold, Silver, Rose Gold)
- Hasil: 3 rows di `product_retail`
  - "Crystal Bracelet - Gold"
  - "Crystal Bracelet - Silver"
  - "Crystal Bracelet - Rose Gold"

**Script ini sudah menggunakan OPSI 3 (uncommented)**. Jika ingin opsi lain, comment OPSI 3 dan uncomment OPSI 1 atau 2.

---

### Step 3: Run Migration

Execute script di Supabase SQL Editor atau via CLI:

```bash
# Via Supabase CLI
npm run supabase:db:push
# atau
supabase db push

# Atau langsung run SQL file
psql -U postgres -d your_database -f migrate_lucky_charm_to_retail.sql
```

---

### Step 4: Verification

Setelah migrasi, jalankan query verification yang ada di STEP 3:

```sql
SELECT 
  pr.id,
  pr.name,
  pr.slug,
  pr.price,
  pr.stock,
  pr.weight,
  pr.is_active,
  c.name as category_name
FROM product_retail pr
LEFT JOIN categories c ON pr.category_id = c.id
WHERE pr.slug LIKE '%-retail'
ORDER BY pr.id DESC;
```

**Check:**
- ✅ Semua produk Lucky Charm sudah masuk?
- ✅ Price, stock, weight sudah terisi dengan benar?
- ✅ Slug unique (tidak ada duplicate)?
- ✅ Category masih benar?

---

### Step 5 (Optional): Rollback

Jika ada masalah, uncomment dan run STEP 4 untuk rollback:

```sql
-- Hapus semua data yang baru dimigrate
DELETE FROM product_retail
WHERE slug LIKE '%-retail';
```

---

## ⚠️ Important Notes

### 1. **Slug Conflict**
Script menambahkan suffix `-retail` pada slug untuk menghindari konflik dengan tabel `products` yang lama. Jika tidak ingin suffix, hapus bagian `|| '-retail'`.

```sql
-- Dengan suffix (default)
p.slug || '-retail' as slug

-- Tanpa suffix (pastikan tidak ada konflik!)
p.slug as slug
```

### 2. **Deleted Products**
Script sudah filter `p.deleted_at IS NULL` dan `pv.deleted_at IS NULL` untuk skip produk/variant yang sudah di-soft delete.

### 3. **Dimension Fields (length, width, height)**
Tabel lama tidak punya field ini, jadi akan diisi `NULL`. Jika perlu, update manual nanti:

```sql
UPDATE product_retail
SET length = 10, width = 5, height = 2
WHERE id = 123;
```

### 4. **Image Migration**
Script ambil dari `p.image_url`. Jika ada multiple images di `product_images`, ambil yang `is_primary = true`:

```sql
-- Optional: Ambil primary image dari product_images
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
-- Ganti: p.image_url as image
-- Dengan: COALESCE(pi.image_url, p.image_url) as image
```

---

## 📝 Example Scenarios

### Scenario 1: Simple Migration (1 Variant per Product)
```
Product: "Lucky Coin"
Variant: "Default" (price: 50000, stock: 100, weight: 50)

Result:
- 1 row di product_retail
- name: "Lucky Coin"
- price: 50000
- stock: 100
```

### Scenario 2: Multiple Variants (Using OPSI 3)
```
Product: "Crystal Bracelet"
Variants:
  - "Gold" (price: 150000, stock: 15, weight: 30)
  - "Silver" (price: 135000, stock: 20, weight: 30)
  - "Rose Gold" (price: 145000, stock: 10, weight: 30)

Result:
- 3 rows di product_retail
  1. name: "Crystal Bracelet - Gold", price: 150000, stock: 15
  2. name: "Crystal Bracelet - Silver", price: 135000, stock: 20
  3. name: "Crystal Bracelet - Rose Gold", price: 145000, stock: 10
```

### Scenario 3: Multiple Variants (Using OPSI 2 - Aggregate)
```
Product: "Crystal Bracelet"
Variants: (same as above)

Result:
- 1 row di product_retail
- name: "Crystal Bracelet"
- price: 150000 (max price)
- stock: 45 (sum of 15+20+10)
- weight: 30 (max weight)
```

---

## 🔧 Customization

### Filter by Specific Product IDs
```sql
WHERE p.id IN (42, 43, 44)  -- hanya migrate product ID tertentu
```

### Filter by Price Range
```sql
WHERE pv.price BETWEEN 50000 AND 500000  -- hanya product dengan harga 50k-500k
```

### Filter by Stock Availability
```sql
WHERE pv.stock > 0  -- hanya product yang ada stock
```

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check tabel structure dengan script `check_products_structure.sql`
2. Verify kategori Lucky Charm exists
3. Check constraint errors di PostgreSQL logs

---

## ✅ Checklist

- [ ] Backup database
- [ ] Preview data (STEP 1)
- [ ] Pilih strategi migrasi (OPSI 1/2/3)
- [ ] Run migration
- [ ] Verification hasil
- [ ] Update frontend untuk consume `product_retail` table
- [ ] Test e-commerce flow dengan data baru

---

**Created:** 2026-06-09  
**Version:** 1.0  
**Author:** Spark Stage Team
