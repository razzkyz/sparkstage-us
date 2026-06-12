# ⚡ Quick Start: Lucky Charm Migration

> **Tujuan:** Migrate products dengan kategori "Lucky Charm" dari tabel `products` (lama) ke `product_retail` (baru)

---

## 🚀 5-Minute Quick Start

### Step 1: Check Data (2 min)
```sql
-- Cek berapa products Lucky Charm yang ada
SELECT COUNT(*) as total_products
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%';

-- Preview sample data
SELECT p.name, pv.name as variant, pv.price, pv.stock
FROM products p
INNER JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.name ILIKE '%lucky charm%'
LIMIT 5;
```

### Step 2: Run Migration (1 min)
```sql
-- Copy-paste dari migrate_lucky_charm_advanced.sql dan run!
-- Script sudah include semua checks dan validations
```

### Step 3: Verify (1 min)
```sql
-- Check hasil migrasi
SELECT COUNT(*) as migrated_count
FROM product_retail
WHERE slug LIKE '%-retail';

-- Quick preview
SELECT name, price, stock FROM product_retail
WHERE slug LIKE '%-retail'
ORDER BY id DESC
LIMIT 10;
```

### Step 4: Test (1 min)
```sql
-- Test query untuk frontend
SELECT 
  pr.id,
  pr.name,
  pr.slug,
  pr.price,
  pr.stock,
  pr.image,
  c.name as category
FROM product_retail pr
LEFT JOIN categories c ON pr.category_id = c.id
WHERE pr.is_active = true
  AND pr.stock > 0
ORDER BY pr.created_at DESC;
```

---

## 📋 TL;DR Commands

### For Development/Testing:
```bash
# 1. Preview data
psql -d your_db -f check_products_structure.sql

# 2. Run simple migration
psql -d your_db -f migrate_lucky_charm_to_retail.sql
```

### For Production:
```bash
# Run advanced migration with all checks
psql -d your_db -f migrate_lucky_charm_advanced.sql
```

---

## 🎯 Default Behavior

Script akan:
- ✅ Migrate **SETIAP VARIANT** sebagai product terpisah
- ✅ Format nama: `"Product Name - Variant Name"`
- ✅ Format slug: `"product-slug-sku-retail"`
- ✅ Skip products yang sudah di-soft delete
- ✅ Skip slug yang sudah ada (ON CONFLICT DO NOTHING)
- ✅ Include attributes di description

---

## 📊 Expected Output

```
===============================================
Migration Summary:
  Products to migrate: 12
  Total variants: 36
  Average variants per product: 3.00
===============================================

Migration Completed!
  Total migrated: 36
  Active products: 36
  Inactive products: 0
  Average price: Rp 125000
  Total stock: 420 units
===============================================
```

---

## ⚠️ Quick Checks

### Before Running:
```sql
-- ✅ Kategori exists?
SELECT * FROM categories WHERE name ILIKE '%lucky charm%';

-- ✅ Tabel product_retail exists?
SELECT COUNT(*) FROM product_retail;
```

### After Running:
```sql
-- ✅ Data masuk?
SELECT COUNT(*) FROM product_retail WHERE slug LIKE '%-retail';

-- ✅ Ada issue?
SELECT 'Zero Price' as issue, COUNT(*) 
FROM product_retail 
WHERE price = 0 AND slug LIKE '%-retail'
UNION ALL
SELECT 'Zero Stock', COUNT(*) 
FROM product_retail 
WHERE stock = 0 AND slug LIKE '%-retail';
```

---

## 🆘 Quick Rollback

```sql
-- Hapus semua hasil migrasi
DELETE FROM product_retail WHERE slug LIKE '%-retail';

-- Verify
SELECT COUNT(*) FROM product_retail;
```

---

## 📞 Need More Details?

👉 Read: `MIGRATION_LUCKY_CHARM_README.md` (comprehensive guide)  
👉 Use: `migrate_lucky_charm_advanced.sql` (production-ready script)  
👉 Check: `MIGRATION_SUMMARY.md` (all files explanation)

---

**Pro Tip:** Run di staging/dev dulu sebelum production! 🚀
