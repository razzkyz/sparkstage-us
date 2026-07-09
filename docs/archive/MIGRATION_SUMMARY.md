# 📦 Lucky Charm Products Migration Summary

## Files Created

Saya telah membuat 4 file untuk membantu migrasi data Lucky Charm products dari tabel lama (`products` + `product_variants`) ke tabel baru (`product_retail`):

### 1. `check_products_structure.sql` 
**Purpose:** Script untuk explorasi dan analisis struktur tabel

**What it does:**
- Menampilkan struktur lengkap tabel `products`
- Menampilkan struktur lengkap tabel `product_retail`
- Mencari kategori Lucky Charm di database
- Preview data products dengan kategori Lucky Charm

**How to use:**
```bash
# Run via Supabase dashboard SQL Editor
# atau
psql -U postgres -d your_db -f check_products_structure.sql
```

---

### 2. `migrate_lucky_charm_to_retail.sql` ⭐ MAIN SCRIPT
**Purpose:** Script migrasi utama dengan 3 opsi strategi

**What it does:**
- **OPSI 1:** Migrate dengan harga tertinggi per product
- **OPSI 2:** Migrate dengan total stock (aggregate)
- **OPSI 3:** Migrate setiap variant sebagai product terpisah (DEFAULT)

**Features:**
✅ Perbedaan struktur tabel dijelaskan dengan tabel ASCII  
✅ Preview data sebelum migrasi  
✅ 3 strategi migrasi yang bisa dipilih  
✅ Verification query  
✅ Rollback script  

**How to use:**
1. Uncomment STEP 1 untuk preview
2. Pilih salah satu OPSI (1, 2, atau 3)
3. Run script
4. Verify dengan STEP 3

---

### 3. `MIGRATION_LUCKY_CHARM_README.md` 📚 DOCUMENTATION
**Purpose:** Dokumentasi lengkap cara migrasi

**What it contains:**
- 📋 Overview dan tujuan migrasi
- 📊 Tabel perbandingan struktur lama vs baru
- 🚀 Step-by-step tutorial dengan screenshots
- ⚠️ Important notes dan edge cases
- 📝 Example scenarios untuk berbagai kasus
- 🔧 Customization options
- ✅ Checklist untuk memastikan semua langkah sudah dilakukan

**Recommended:** Baca file ini dulu sebelum run migrasi!

---

### 4. `migrate_lucky_charm_advanced.sql` 🚀 ADVANCED
**Purpose:** Script migrasi advanced dengan pre-flight checks dan reporting

**What it does:**
- **PART 1:** Pre-flight checks (kategori exists, count products, slug conflicts)
- **PART 2:** Migration dengan conflict handling (`ON CONFLICT DO NOTHING`)
- **PART 3:** Post-migration reports (success summary, statistics)
- **PART 4:** Data quality checks (missing images, zero price, etc.)
- **PART 5:** Final verification query

**Features:**
✅ Automatic validation sebelum migrasi  
✅ Conflict detection dan handling  
✅ Detailed logging dengan `RAISE NOTICE`  
✅ Primary image detection dari `product_images` table  
✅ Attributes formatting dalam description  
✅ Price distribution analysis  
✅ Data quality reports  

**How to use:**
```bash
# Recommended untuk production migration
psql -U postgres -d your_db -f migrate_lucky_charm_advanced.sql
```

---

## 🎯 Which File Should You Use?

### For Quick Exploration:
👉 Use `check_products_structure.sql` untuk melihat data apa saja yang ada

### For Simple Migration:
👉 Use `migrate_lucky_charm_to_retail.sql` + read `MIGRATION_LUCKY_CHARM_README.md` terlebih dahulu

### For Production Migration:
👉 Use `migrate_lucky_charm_advanced.sql` (sudah include validations dan reports)

---

## 📊 Key Mapping Strategy (Default: OPSI 3)

Script menggunakan strategi **"Setiap Variant = Product Terpisah"** karena:

1. ✅ **Preserve Detail:** Setiap variant dengan price/stock berbeda tetap jadi product terpisah
2. ✅ **E-Commerce Ready:** User bisa pilih setiap variant sebagai product individual
3. ✅ **No Data Loss:** Tidak ada data variant yang hilang atau di-aggregate
4. ✅ **Scalable:** Mudah untuk add variant baru di masa depan

### Example Output:

**Before (products + product_variants):**
```
Product: "Crystal Bracelet" (id: 42)
├── Variant: "Gold" (sku: CB-GOLD, price: 150000, stock: 15)
├── Variant: "Silver" (sku: CB-SILVER, price: 135000, stock: 20)
└── Variant: "Rose Gold" (sku: CB-ROSE, price: 145000, stock: 10)
```

**After (product_retail):**
```
id: 1001 | name: "Crystal Bracelet - Gold"      | slug: "crystal-bracelet-cb-gold-retail"
id: 1002 | name: "Crystal Bracelet - Silver"    | slug: "crystal-bracelet-cb-silver-retail"
id: 1003 | name: "Crystal Bracelet - Rose Gold" | slug: "crystal-bracelet-cb-rose-retail"
```

---

## ⚠️ Important Notes

### 1. Slug Suffix
Script menambahkan suffix `-retail` pada slug untuk menghindari konflik dengan tabel `products` yang masih ada.

```sql
-- Contoh:
-- Old slug: "crystal-bracelet"
-- New slug: "crystal-bracelet-cb-gold-retail"
```

### 2. Missing Fields
Field yang tidak ada di tabel lama akan diisi `NULL`:
- `length`, `width`, `height` → NULL (perlu update manual jika diperlukan)

### 3. Image Handling
- Advanced script: Ambil dari `product_images` (primary) atau fallback ke `products.image_url`
- Simple script: Langsung ambil dari `products.image_url`

### 4. Soft Delete Handling
Script otomatis skip products/variants yang sudah di-soft delete (`deleted_at IS NOT NULL`)

---

## 🔄 Workflow Recommendation

```
1. READ:  MIGRATION_LUCKY_CHARM_README.md
   ↓
2. RUN:   check_products_structure.sql (untuk explorasi)
   ↓
3. TEST:  migrate_lucky_charm_to_retail.sql (di staging/dev)
   ↓
4. PROD:  migrate_lucky_charm_advanced.sql (final production run)
   ↓
5. VERIFY: Check data quality reports
```

---

## 📞 Next Steps

Setelah migrasi selesai:

1. **Frontend Integration:**
   - Update API untuk query dari `product_retail` instead of `products`
   - Update product listing pages
   - Update product detail pages
   - Update shopping cart logic

2. **Testing:**
   - Test product display
   - Test add to cart
   - Test checkout flow
   - Test stock management

3. **Data Maintenance:**
   - Update `length`, `width`, `height` jika diperlukan untuk shipping calculation
   - Upload better product images jika ada
   - Update descriptions untuk SEO

4. **Cleanup (Optional):**
   - Setelah yakin data sudah benar, bisa drop suffix `-retail` dari slug
   ```sql
   UPDATE product_retail 
   SET slug = REPLACE(slug, '-retail', '')
   WHERE slug LIKE '%-retail';
   ```

---

## ✅ Success Criteria

Migration dianggap sukses jika:

- [ ] Semua products Lucky Charm sudah ada di `product_retail`
- [ ] Price, stock, weight sudah terisi dengan benar
- [ ] Tidak ada slug conflicts
- [ ] Semua products punya image
- [ ] Category mapping masih benar
- [ ] Frontend bisa display products dari `product_retail`
- [ ] Checkout flow berfungsi dengan baik

---

## 🆘 Troubleshooting

### Issue: "Kategori Lucky Charm tidak ditemukan"
**Solution:** 
```sql
-- Check kategori yang ada
SELECT id, name, slug FROM categories WHERE name ILIKE '%charm%';

-- Jika tidak ada, create dulu
INSERT INTO categories (name, slug, parent_id) 
VALUES ('Lucky Charm', 'lucky-charm', NULL);
```

### Issue: "Slug conflict"
**Solution:**
```sql
-- Check existing slugs
SELECT slug FROM product_retail WHERE slug LIKE '%-retail';

-- Change suffix atau tambah unique identifier
-- Edit di script: p.slug || '-v2-retail'
```

### Issue: "Zero price atau zero stock"
**Solution:**
```sql
-- Check products dengan price 0
SELECT * FROM product_retail WHERE price = 0;

-- Update manual jika perlu
UPDATE product_retail 
SET price = 100000 
WHERE id = 123 AND price = 0;
```

---

**Created:** 2026-06-09  
**Status:** Ready to Use ✅  
**Version:** 1.0
