# Data Cleanup & Production Sync Guide

## Overview

Dokumentasi ini menjelaskan cara mengidentifikasi, membersihkan data dummy, dan memvalidasi data production dari DOKU.

## Definisi Data

### Dummy Data

Data yang ditandai sebagai "dummy" atau "test":
- **Products**: nama mengandung "test", "demo", "dummy"
- **Tickets**: nama mengandung "test", "demo", "dummy"  
- **Orders**: email mengandung "test@", "dummy@", "demo@", phone "08888", "08999"
- **Order Products**: linked ke dummy products atau test orders

### Production Data

Data yang valid dari user/DOKU real:
- Products dengan variants lengkap
- Tickets yang aktif (bukan test)
- Orders dengan doku_order_id (linked ke DOKU)
- Customer dengan phone/email yang valid

## Step-by-Step Process

### Pilih Strategi: Cleanup atau Sync?

Sebelum mulai, pilih satu dari dua strategi:

**Strategi 1: CLEANUP** (Recommended - bersih total)
- ✅ Delete semua dummy data
- ✅ Keep hanya production data dari DOKU
- ✅ Fresh start tanpa test clutter

**Strategi 2: SYNC** (Keep dummy untuk testing)
- ✅ Keep dummy data tetapi update ke production format
- ✅ Align dummy pricing, availability dengan production
- ✅ Useful jika masih butuh testing environment

---

## Strategi 1: CLEANUP (Recommended)

### 1️⃣ Identify Dummy Data

Scan database untuk menemukan semua dummy data:

```bash
npm run data:identify-dummy
```

Output akan menunjukkan:
- ✓ Jumlah dummy products dengan alasan
- ✓ Jumlah dummy tickets dengan alasan
- ✓ Jumlah test orders dengan alasan
- ✓ Jumlah order_products yang linked ke dummy data

**Contoh Output:**
```
🔍 Scanning untuk dummy data...

📦 Checking products...
✓ Found 3 dummy products

🎫 Checking tickets...
✓ Found 1 dummy ticket

📋 Checking orders...
✓ Found 5 test orders

❌ Dummy Products (3):
   - Test Product 1 (ID: abc123) - Reason: name contains test
   - Demo Costume (ID: def456) - Reason: name contains demo
   - Sample Dress (ID: ghi789) - Reason: description is test data

❌ Dummy Tickets (1):
   - TEST ENTRANCE TICKET (ID: jkl012) - Reason: name contains test

❌ Test Orders (5):
   - John Test (ID: mno345) - Test email: test@example.com
   ...

⚠️  12 order_products linked ke dummy data
```

### 2️⃣ Validate Production Data

Pastikan production data valid sebelum cleanup:

```bash
npm run data:validate-production
```

Output akan menunjukkan:
- ✓ Valid products dengan variants
- ✓ Valid tickets  
- ✓ Valid orders dengan DOKU reference
- ⚠️ Produk tanpa variants (potentially orphaned)
- ⚠️ Orders tanpa DOKU reference (incomplete sync)

**Contoh Output:**
```
✓ Found 15 valid products
  ⚠️  2 products without variants

✓ Found 8 valid tickets

✓ Found 42 valid orders
  - Linked to DOKU: 42
  - Missing DOKU reference: 0
```

### 3️⃣ Cleanup Dummy Data (Dry Run)

Jalankan cleanup dalam dry-run mode terlebih dahulu:

```bash
npm run data:cleanup-dummy
```

Ini akan:
- ✓ Show apa yang akan didelete
- ✓ NOT melakukan delete sesungguhnya
- ✓ Memastikan cascade delete tidak merusak production data

**Contoh Output:**
```
🧹 DRY RUN - CLEANUP DUMMY DATA

Found: 3 dummy products, 5 test orders

📋 Step 1: Deleting order_products...
   [DRY RUN] Deleted 12 order_products from dummy products
   [DRY RUN] Deleted 8 order_products from test orders

📋 Step 2: Deleting test orders...
   [DRY RUN] Deleted 5 test orders

📦 Step 3: Deleting product_variants...
   [DRY RUN] Deleted 5 product_variants

📦 Step 4: Deleting dummy products...
   [DRY RUN] Deleted 3 dummy products

🎫 Step 5: Deleting dummy tickets...
   [DRY RUN] Deleted 1 dummy ticket

✅ Dry run successful. To execute deletion, run:
   npm run data:cleanup-dummy -- --confirm
```

### 4️⃣ Cleanup Dummy Data (Execute)

Jalankan cleanup yang sesungguhnya dengan flag `--confirm`:

```bash
npm run data:cleanup-dummy:confirm
```

**⚠️ WARNING**: Ini akan **permanently delete** data. Pastikan sudah backup atau sudah review dry-run.

## Sync Data dengan DOKU

Setelah cleanup, pastikan production data ter-sync dengan DOKU:

### Check Sync Status

```bash
npm run data:validate-production
```

Pastikan semua orders punya `doku_order_id`.

### Manual Sync (Jika Diperlukan)

Jika ada orders yang missing DOKU reference:

1. Check webhook logs di Supabase
2. Run: `SELECT order_number, status FROM orders WHERE doku_order_id IS NULL;`
3. Manual update atau re-trigger webhook

## Automation (Optional)

Untuk production environment, bisa di-setup sebagai cron job:

```bash
# Identify & report setiap hari
0 2 * * * npm run data:identify-dummy >> /var/log/spark-cleanup.log 2>&1

# Validate production data
0 3 * * * npm run data:validate-production >> /var/log/spark-validate.log 2>&1
```

## Troubleshooting

### "permission denied" error

- Pastikan menggunakan admin Supabase key
- Check RLS policies untuk tables

### Cascade delete gagal

- Ada foreign key constraint
- Check order_products → products relationship
- Review migration docs: `docs/runbooks/db-migrations.md`

### Production data hilang

- STOP! Jangan lanjut
- Restore dari backup database
- Check apakah filter "dummy" terlalu luas

---

## Strategi 2: SYNC (Opsional - Jika Ingin Keep Dummy)

Jika Anda ingin keep dummy data untuk testing tetapi update-nya match production format:

### 1️⃣ Identify Dummy Data (sama seperti di atas)

```bash
npm run data:identify-dummy
```

### 2️⃣ Validate Production Data

```bash
npm run data:validate-production
```

### 3️⃣ Sync Dummy Data ke Production Format (Dry Run)

```bash
npm run data:sync-dummy-to-production
```

Output akan show:
- Dummy product prices akan di-random ke range yang valid
- Dummy tickets akan match production ticket capacity
- Test order payment references akan di-clear

### 4️⃣ Execute Sync

```bash
npm run data:sync-dummy-to-production:confirm
```

**What this does:**
- ✓ Updates dummy product variant prices ke range realistic (1000-50000 IDR)
- ✓ Syncs dummy ticket capacity dengan production tickets
- ✓ Clears DOKU payment references dari test orders (reset ke pending)
- ✓ Keeps order structure intact untuk testing checkout flow

---

## Troubleshooting

### "permission denied" error

- Pastikan menggunakan admin Supabase key
- Check RLS policies untuk tables

### Cascade delete gagal

- Ada foreign key constraint
- Check order_products → products relationship
- Review migration docs: `docs/runbooks/db-migrations.md`

### Production data hilang

- STOP! Jangan lanjut
- Restore dari backup database
- Check apakah filter "dummy" terlalu luas

## Next Steps

### Untuk CLEANUP Strategy:

1. ✅ Run `npm run data:identify-dummy` 
2. ✅ Review output
3. ✅ Run `npm run data:validate-production`
4. ✅ Run `npm run data:cleanup-dummy` (dry-run)
5. ✅ If OK, run `npm run data:cleanup-dummy:confirm`
6. ✅ Validate production data lagi
7. ✅ Check DOKU sync status

### Atau untuk SYNC Strategy (jika keep dummy):

1. ✅ Run `npm run data:identify-dummy` 
2. ✅ Review output
3. ✅ Run `npm run data:validate-production`
4. ✅ Run `npm run data:sync-dummy-to-production` (dry-run)
5. ✅ If OK, run `npm run data:sync-dummy-to-production:confirm`
6. ✅ Verify dummy data sekarang match production format

## Safety Checklist

- [ ] Sudah backup database
- [ ] Sudah review identify-dummy output
- [ ] Sudah run dry-run cleanup
- [ ] Sudah validate production data sebelum cleanup
- [ ] Sudah validate production data sesudah cleanup
- [ ] Sudah check DOKU webhook logs untuk orphaned orders
- [ ] Ada proper audit log entry untuk cleanup

## Reference

- DB schema: `docs/architecture.md`
- DOKU payment flow: `docs/runbooks/doku-payments.md`
- DB migrations: `docs/runbooks/db-migrations.md`
- Data cleanup scripts: `scripts/identify-dummy-data.ts`, `scripts/cleanup-dummy-data.ts`, `scripts/validate-production-data.ts`
