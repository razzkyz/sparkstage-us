# R2 Migration - Next Steps 🚦

**Status**: ⏸️ PAUSED (Bagus! Kamu berhenti di waktu yang tepat!)

## Ringkasan Masalah

Migrasi ImageKit → Cloudflare R2 **belum selesai**:
- ✓ **2,227 gambar berhasil** di-upload (44.3%)
- ✗ **2,803 gambar gagal** (55.7%)
- **Total**: 5,030 gambar

### Penyebab Gagal

Semua kegagalan karena **salah menggunakan credential type**:

1. **Batch pertama (2,803 gambar)**: Pakai **Cloudflare API Token** (53 karakter) ❌
   - Error: "Credential access key has length 53, should be 32"
   
2. **Batch kedua (2,227 gambar)**: Pakai **R2 Access Keys** (32 karakter) ✅
   - Semua berhasil!

## Tentang Folder `/public/` di ImageKit

Kamu benar memperhatikan ini! Di ImageKit ada 2 folder:
- `/products/` - Sebagian sudah di-migrate (2,227 / 5,030)
- `/public/` - **Belum di-investigate**

**Pertanyaan penting**:
1. Apa isi folder `/public/` di ImageKit?
2. Apakah itu gambar produk atau aset lain (logo, banner, dll)?
3. Apakah database ada yang reference ke folder `/public/`?

### Cara Check Folder `/public/`

Jalankan SQL query ini di Supabase SQL Editor:

```sql
-- Lihat berapa gambar di folder /public/
SELECT 
  CASE 
    WHEN provider_file_path LIKE '/public/%' THEN 'public'
    WHEN provider_file_path LIKE '/products/%' THEN 'products'
    ELSE 'other'
  END AS folder_type,
  COUNT(*) as image_count
FROM product_images
WHERE provider = 'imagekit'
GROUP BY folder_type;
```

Atau pakai script yang sudah dibuat:
```bash
# Copy isi file ke Supabase SQL Editor
cat scripts/check-imagekit-public-folder.sql
```

## Solusi: Retry Upload yang Gagal

### Langkah 1: Verifikasi Credential Sekarang

Cek file `.env.r2-migration` sudah benar:

```bash
type .env.r2-migration
```

Pastikan:
- ✅ `R2_ACCESS_KEY_ID` panjangnya **32 karakter**
- ✅ Bukan Cloudflare API Token (yang dimulai dengan `cfat_`)

**Credential yang benar** (sudah ada di `.env.r2-migration`):
```
R2_ACCESS_KEY_ID=2e5f3b814dfd2925e60bb5aad6f74483  ← 32 karakter ✓
```

### Langkah 2: Test Retry Script (Dry Run)

Lihat preview apa yang akan di-retry tanpa eksekusi:

```bash
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration --dry-run
```

Output akan menunjukkan:
- Berapa gambar yang akan di-retry (seharusnya 2,803)
- Sample gambar yang akan di-upload ulang
- Tidak akan upload apapun (cuma preview)

### Langkah 3: Execute Retry

Kalau dry run terlihat OK, jalankan retry:

```bash
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration
```

Script akan:
1. Baca manifest untuk cari yang gagal
2. Download ulang dari ImageKit
3. Upload ke R2 dengan credential yang benar
4. Buat file baru: `backups/r2-migration-manifest-retry.jsonl`

**Estimasi waktu**: ~10-15 menit (untuk 2,803 gambar dengan concurrency 5)

### Langkah 4: Verifikasi 100% Sukses

Setelah retry selesai, check status:

```bash
node scripts/r2-migration-status.mjs --env-file .env.r2-migration
```

**Target hasil**:
```
Total images: 5,030
✓ Succeeded: 5,030 (100%)
✗ Failed: 0 (0%)
```

## Cutover (Update Database)

**⚠️ JANGAN JALANKAN SEBELUM 100% SUKSES!**

### What is "Cutover"?

Cutover = **Update database** `product_images` table, ganti semua URL dari ImageKit ke R2.

**Sebelum cutover**:
```sql
-- Database masih pakai ImageKit
image_url = 'https://ik.imagekit.io/hjnuyz1t3/products/32/image.png'
```

**Setelah cutover**:
```sql
-- Database update ke R2
image_url = 'https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/32/image.png'
```

### Mengapa Harus 100% Sukses Dulu?

Kalau ada gambar yang gagal upload ke R2, tapi kita sudah update database, maka:
- ❌ Website akan coba load gambar dari R2
- ❌ Gambar tidak ada di R2 (karena gagal upload)
- ❌ Hasil: **Broken images** di website

### Kapan Aman untuk Cutover?

✅ **Aman** kalau:
1. Semua 5,030 gambar sukses upload ke R2 (100%)
2. Sudah test sample R2 URLs bisa diakses public
3. Sudah backup database
4. Sudah check folder `/public/` (pastikan tidak ada yang terlewat)

## Checklist Lengkap

### 🔍 Investigation Phase (SEKARANG)
- [ ] Check folder `/public/` di ImageKit (via SQL query)
- [ ] Tentukan apakah `/public/` perlu di-migrate juga
- [ ] Verifikasi credential di `.env.r2-migration` (harus 32 chars)

### 🔄 Retry Phase
- [ ] Run dry-run retry script (preview)
- [ ] Execute retry script (upload 2,803 gambar yang gagal)
- [ ] Verify 100% success (5,030 / 5,030)

### 🎯 Pre-Cutover Phase
- [ ] Test 10 random R2 URLs bisa diakses public
- [ ] Backup database (`product_images` table)
- [ ] Buat rollback plan jika ada masalah

### 🚀 Cutover Phase (BELUM EKSEKUSI)
- [ ] Run database cutover script
- [ ] Update semua URLs ImageKit → R2
- [ ] Test website langsung setelah cutover
- [ ] Check beberapa halaman produk

### ✅ Post-Cutover Validation
- [ ] Full website image audit
- [ ] Monitor broken images
- [ ] Keep ImageKit aktif 7 hari sebagai fallback
- [ ] Delete ImageKit images setelah yakin 100% OK

## Files yang Relevan

### Scripts
- `scripts/retry-failed-r2-migrations.mjs` - Retry upload yang gagal ⭐ **BARU**
- `scripts/migrate-imagekit-to-r2.mjs` - Script utama (sudah dijalankan)
- `scripts/r2-migration-status.mjs` - Check status migrasi
- `scripts/verify-r2-urls.mjs` - Test R2 URLs
- `scripts/check-imagekit-public-folder.sql` - SQL check folder /public/ ⭐ **BARU**

### Data Files
- `backups/r2-migration-manifest.jsonl` - Log migrasi saat ini
- `backups/r2-migration-manifest-retry.jsonl` - Log retry (akan dibuat)
- `.env.r2-migration` - R2 credentials

### Documentation
- `docs/runbooks/r2-migration.md` - Full migration guide
- `docs/runbooks/R2_EGRESS_SETUP.md` - Egress setup tutorial
- `docs/runbooks/R2_MIGRATION_QUICKSTART.md` - Quick reference
- `R2_MIGRATION_DIAGNOSIS.md` - Problem diagnosis ⭐ **BARU**
- `R2_MIGRATION_NEXT_STEPS.md` - Dokumen ini ⭐ **BARU**

## Command Cheatsheet

```bash
# 1. Check folder /public/ (copy ke Supabase SQL Editor)
cat scripts/check-imagekit-public-folder.sql

# 2. Verify credentials
type .env.r2-migration

# 3. Retry failed uploads (dry run)
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration --dry-run

# 4. Retry failed uploads (execute)
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration

# 5. Check final status
node scripts/r2-migration-status.mjs --env-file .env.r2-migration

# 6. Test sample R2 URLs
node scripts/verify-r2-urls.mjs --env-file .env.r2-migration --sample 10
```

## Pertanyaan yang Mungkin Kamu Punya

### Q1: Apakah website masih berfungsi normal sekarang?
**A**: ✅ **YA!** Database masih pakai ImageKit URLs, jadi website 100% normal. Tidak ada downtime.

### Q2: Apakah aman untuk retry upload?
**A**: ✅ **SANGAT AMAN!** Retry script:
- Hanya upload file ke R2 (tidak touch database)
- Tidak akan overwrite file yang sudah sukses
- Bisa dijalankan berkali-kali tanpa masalah

### Q3: Berapa lama retry akan selesai?
**A**: Estimasi **10-15 menit** untuk 2,803 gambar dengan concurrency 5.

### Q4: Bagaimana kalau retry masih ada yang gagal?
**A**: 
- Check error message di log
- Mungkin perlu adjust concurrency (turunkan jika ada timeout)
- Bisa retry lagi dengan filter ke yang gagal saja

### Q5: Folder `/public/` itu apa?
**A**: **BELUM TAHU!** Makanya kita perlu investigate dulu dengan SQL query. Bisa jadi:
- Legacy files yang tidak terpakai
- Gambar produk lama
- Assets lain (banner, logo, dll)

### Q6: Kapan bisa cutover (update database)?
**A**: Setelah:
1. ✅ 100% gambar sukses upload (5,030 / 5,030)
2. ✅ Sudah check folder `/public/` dan ambil keputusan
3. ✅ Sudah test sample R2 URLs
4. ✅ Sudah backup database

## Rekomendasi Action Sekarang

**Prioritas 1** - Investigate folder `/public/`:
```bash
# Copy SQL query ke Supabase SQL Editor
cat scripts/check-imagekit-public-folder.sql
```

**Prioritas 2** - Retry failed uploads:
```bash
# Dry run dulu
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration --dry-run

# Kalau OK, execute
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration
```

**Prioritas 3** - Verify 100% success:
```bash
node scripts/r2-migration-status.mjs --env-file .env.r2-migration
```

---

**🎯 Goal**: Dapat 100% success rate (5,030 / 5,030) sebelum cutover database!

**💡 Tip**: Kamu sudah melakukan hal yang tepat dengan menghentikan proses untuk investigate. Ini menghindari broken images di production!
