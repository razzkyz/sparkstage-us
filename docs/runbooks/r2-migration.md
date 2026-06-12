# Cloudflare R2 Migration Runbook

Runbook ini adalah panduan lengkap untuk memindahkan gambar produk dari ImageKit ke Cloudflare R2 dengan zero egress cost.

Dokumen ini ditulis operasional dan step-by-step, fokus pada eksekusi yang aman dengan checkpoint verifikasi dan rollback plan.

## 📋 Table of Contents

1. [Tujuan](#1-tujuan)
2. [Mengapa R2?](#2-mengapa-r2)
3. [Kondisi Saat Ini](#3-kondisi-saat-ini)
4. [Arsitektur Target](#4-arsitektur-target)
5. [Kriteria Sukses](#5-kriteria-sukses)
6. [Prasyarat](#6-prasyarat)
7. [Setup Cloudflare R2](#7-setup-cloudflare-r2)
8. [Setup Custom Domain (Opsional)](#8-setup-custom-domain-opsional)
9. [Strategi Implementasi](#9-strategi-implementasi)
10. [Perubahan Schema](#10-perubahan-schema)
11. [Perubahan Kode](#11-perubahan-kode)
12. [Fase Eksekusi](#12-fase-eksekusi)
13. [Test Matrix](#13-test-matrix)
14. [Rollback Plan](#14-rollback-plan)
15. [Monitoring](#15-monitoring)
16. [Cleanup](#16-cleanup)
17. [Definisi Done](#17-definisi-done)

## 1. Tujuan

### Tujuan Utama

1. Menghilangkan biaya ImageKit **$9/bulan** (Free plan limit: 20 GB bandwidth per 30 hari)
2. Memindahkan delivery gambar produk ke Cloudflare R2 dengan **zero egress cost**
3. Menyimpan ~2000+ gambar produk di R2 dengan akses publik
4. Tidak ada downtime atau broken images selama migrasi

### Non-Tujuan

1. Tidak memigrasikan bucket Supabase lain (`banners`, `beauty-images`, dll)
2. Tidak mengubah upload flow (tetap via frontend → backend auth → R2)
3. Tidak mengubah schema produk secara besar-besaran

## 2. Mengapa R2?

### Perbandingan Cost

| Provider | Storage (10 GB) | Bandwidth (20 GB/month) | Total/bulan |
|----------|-----------------|-------------------------|-------------|
| **ImageKit** | Free | Free (max 20 GB) | $9 (sering exceed) |
| **Cloudflare R2** | $0.015 | **$0** (zero egress!) | **$0.015** |
| **Supabase Storage** | Free (limit 1 GB) | N/A | N/A (sudah tidak cukup) |

### Keunggulan R2

1. **Zero Egress Cost**: Tidak ada biaya bandwidth keluar (berbeda dari S3)
2. **S3 Compatible**: SDK dan tools S3 bisa langsung pakai
3. **Global CDN**: Cloudflare edge network (sama cepatnya dengan ImageKit)
4. **Simple Pricing**: $0.015/GB storage only, no surprise bills
5. **Public Buckets**: Bisa expose langsung tanpa signed URLs

### Kapan Migrasi Ini Masuk Akal

✅ **Cocok** jika:
- Bandwidth usage > 20 GB/month (exceed ImageKit free tier)
- Budget ketat, butuh predictable cost
- Mayoritas traffic dari Indonesia/Asia (R2 edge ada di region ini)
- Tidak butuh real-time image transformation (resize on-the-fly)

❌ **Tidak cocok** jika:
- Butuh banyak image transformations (crop, watermark, smart crop)
- Usage < 10 GB/month (ImageKit free tier masih cukup)
- Tidak punya resource untuk handle migration

### Trade-offs

| Feature | ImageKit | R2 |
|---------|----------|-----|
| Image Transformation | ✅ Built-in (URL params) | ❌ Tidak ada (serve as-is) |
| Auto WebP/AVIF | ✅ Ya | ❌ Harus pre-convert |
| Lazy Loading | ✅ Built-in SDK | ⚠️ Manual implementation |
| Cost (20 GB) | $9/mo | **$0.015/mo** |
| Egress Cost | Included | **$0** |
| Setup Complexity | ⭐⭐ (5 menit) | ⭐⭐⭐ (30 menit) |

**Keputusan**: Untuk Spark Stage, R2 lebih masuk akal karena:
1. Images sudah dioptimasi saat upload (tidak perlu real-time transform)
2. Bandwidth usage > 20 GB/month (ImageKit warning frequent)
3. Budget ketat, $9/month = $108/year savings signifikan


## 3. Kondisi Saat Ini

### Status ImageKit (Per 2026-06-09)

1. Total images: **~1598 product images**
2. Storage usage: **~2-3 GB**
3. Bandwidth usage: **~20-25 GB/month** (sering exceed free tier)
4. Provider: `image_provider = 'imagekit'` di `product_images` table
5. URL format: `https://ik.imagekit.io/sparkstage55/products/<uuid>.<ext>`

### Database Schema

Tabel `product_images`:
```sql
CREATE TABLE product_images (
  id BIGINT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  image_provider TEXT NOT NULL DEFAULT 'supabase',
  provider_file_id TEXT,
  provider_file_path TEXT,
  provider_original_url TEXT,
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Upload Flow Saat Ini

1. Admin upload image dari frontend
2. Frontend request auth token dari `imagekit-auth` Edge Function
3. Frontend upload ke ImageKit via `@imagekit/javascript` SDK
4. Frontend save metadata ke `product_images` table:
   - `image_url`: ImageKit public URL
   - `image_provider`: 'imagekit'
   - `provider_file_id`: ImageKit fileId
   - `provider_file_path`: `/products/<uuid>.<ext>`

### Delete Flow Saat Ini

1. Admin click delete image
2. Frontend call `imagekit-delete` Edge Function
3. Edge Function delete dari ImageKit via API (using `fileId`)
4. Frontend delete row dari `product_images` table


## 4. Arsitektur Target

### R2 Bucket Structure

```
sparkstage-public-assets/
└── products/
    ├── <product_id_1>/
    │   ├── <uuid_1>.jpg
    │   ├── <uuid_2>.webp
    │   └── <uuid_3>.png
    ├── <product_id_2>/
    │   └── <uuid_4>.jpg
    └── ...
```

### Public Access URL

**Opsi 1: R2 Default Domain** (Langsung pakai tanpa setup domain)
```
https://<account_id>.r2.cloudflarestorage.com/products/<product_id>/<uuid>.jpg
```

**Opsi 2: Custom Domain** (Recommended untuk production)
```
https://media.sparkstage55.com/products/<product_id>/<uuid>.jpg
```

### Upload Flow Target

1. Admin upload image dari frontend
2. Frontend request **presigned URL** dari `r2-upload-auth` Edge Function
3. Frontend upload langsung ke R2 via presigned PUT URL
4. Frontend save metadata ke `product_images` table:
   - `image_url`: R2 public URL
   - `image_provider`: 'r2'
   - `provider_file_id`: S3 object key (`products/<product_id>/<uuid>.<ext>`)
   - `provider_file_path`: sama dengan `provider_file_id`

### Delete Flow Target

1. Admin click delete image
2. Frontend call `r2-delete` Edge Function
3. Edge Function delete dari R2 via S3 SDK (using object key)
4. Frontend delete row dari `product_images` table

### Egress Strategy

**Public Bucket** dengan Cloudflare CDN:
- Bucket setting: **Allow Public Access**
- Caching: Cloudflare edge automatically caches frequently accessed files
- No signed URLs needed (images are public anyway)
- Zero egress cost dari R2 → Cloudflare CDN → User


## 5. Kriteria Sukses

Migrasi dianggap selesai dan sukses jika:

1. ✅ Semua ~1598 images berhasil diupload ke R2
2. ✅ Zero broken images di website (public & admin)
3. ✅ Database cutover sukses (semua `product_images` pointing ke R2)
4. ✅ ImageKit bandwidth drop ke < 1 GB/month (hanya legacy access)
5. ✅ R2 egress cost = $0/month
6. ✅ Monitoring 14 hari tanpa issue
7. ✅ ImageKit subscription di-cancel (setelah 30 hari soak period)
8. ✅ **Total savings: $9/month = $108/year**

## 6. Prasyarat

### Akun & Akses

1. ✅ **Cloudflare Account** dengan R2 enabled
2. ✅ **R2 API Token** dengan permission `Object Read & Write`
3. ✅ **Supabase CLI** aktif dan linked ke project
4. ✅ **Supabase Service Role Key** untuk migration script
5. ⚠️ **(Optional)** Domain custom untuk R2 public URL

### Tools & Dependencies

```bash
# Node.js & npm (sudah ada)
node --version  # v18+

# AWS SDK v3 (untuk R2 S3-compatible API)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# dotenv untuk env management
npm install dotenv

# CLI tools
npm install -g @cloudflare/wrangler  # Optional, untuk manage R2 via CLI
```

### Environment Variables

File: `.env.r2-migration`

```bash
# Cloudflare R2
R2_ACCOUNT_ID=<your_account_id>
R2_ACCESS_KEY_ID=<your_access_key>
R2_SECRET_ACCESS_KEY=<your_secret_key>
R2_BUCKET_NAME=sparkstage-public-assets
R2_BASE_PATH=products

# Public URL (pilih salah satu)
R2_PUBLIC_BASE_URL=https://<account_id>.r2.cloudflarestorage.com
# R2_PUBLIC_BASE_URL=https://media.sparkstage55.com  # jika pakai custom domain

# Supabase (optional - auto-detect dari CLI)
# SUPABASE_URL=https://hogzjapnkvsihvvbgcdb.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

### Window Kerja

- **Best time**: Off-peak hours (malam/weekend)
- **Estimated duration**: 2-3 jam (setup + migration + verification)
- **No freeze needed**: Migration bisa dilakukan tanpa freeze admin upload


## 7. Setup Cloudflare R2

### Step 7.1: Create R2 Bucket

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigasi ke **R2 Object Storage**
3. Click **Create bucket**
4. Bucket name: `sparkstage-public-assets`
5. Location: **Automatic** (Cloudflare will choose optimal region)
6. Click **Create bucket**

### Step 7.2: Enable Public Access

**⚠️ PENTING: Ini adalah cara egress gratis bekerja!**

1. Masuk ke bucket `sparkstage-public-assets`
2. Tab **Settings**
3. Scroll ke **Public access**
4. Click **Allow Access**
5. Konfirmasi dialog (centang "I understand")
6. Copy **Public Bucket URL**: 
   ```
   https://<account_id>.r2.cloudflarestorage.com
   ```

**Penjelasan**: 
- Public access = files bisa diakses langsung via URL tanpa auth
- Cloudflare CDN akan cache files dari R2
- Egress dari R2 → Cloudflare CDN = **$0**
- Egress dari Cloudflare CDN → User = **$0**

### Step 7.3: Create API Token

1. Dari R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Token name: `sparkstage-r2-migration`
4. Permissions: **Object Read & Write**
5. TTL: **Forever** (atau 1 year)
6. Bucket scope: **Apply to specific buckets only**
   - Select: `sparkstage-public-assets`
7. Click **Create API Token**

8. **COPY dan SIMPAN** (tidak bisa dilihat lagi!):
   ```
   Account ID: <account_id>
   Access Key ID: <access_key_id>
   Secret Access Key: <secret_access_key>
   ```

### Step 7.4: Test R2 Access

```bash
# Set env vars
$env:R2_ACCOUNT_ID="<your_account_id>"
$env:R2_ACCESS_KEY_ID="<your_access_key_id>"
$env:R2_SECRET_ACCESS_KEY="<your_secret_access_key>"

# Test upload (using AWS CLI)
aws s3 cp test.txt s3://sparkstage-public-assets/test.txt `
  --endpoint-url https://<account_id>.r2.cloudflarestorage.com `
  --region auto

# Test public access
curl https://<account_id>.r2.cloudflarestorage.com/test.txt
```

✅ **Success** jika file bisa diakses public tanpa auth.


## 8. Setup Custom Domain (Opsional)

**Rekomendasi**: Setup custom domain untuk production agar URL lebih clean dan migrasi future-proof.

### Step 8.1: Add Custom Domain to R2 Bucket

1. Masuk ke bucket `sparkstage-public-assets`
2. Tab **Settings**
3. Section **Custom Domains**
4. Click **Connect Domain**
5. Enter domain: `media.sparkstage55.com`
6. Click **Continue**

### Step 8.2: Add DNS Record

Cloudflare akan otomatis menambahkan CNAME record jika domain sudah di Cloudflare DNS:

```
Type: CNAME
Name: media
Target: sparkstage-public-assets.<account_id>.r2.cloudflarestorage.com
Proxy: Proxied (orange cloud) ✅
```

**Jika domain TIDAK di Cloudflare**:
1. Login ke DNS provider kamu
2. Add CNAME record manual sesuai instruksi
3. Wait 5-10 menit untuk DNS propagation

### Step 8.3: Verify Custom Domain

```bash
# Test custom domain
curl https://media.sparkstage55.com/test.txt
```

✅ **Success** jika file accessible via custom domain.

### Step 8.4: Update R2_PUBLIC_BASE_URL

Edit `.env.r2-migration`:
```env
R2_PUBLIC_BASE_URL=https://media.sparkstage55.com
```

### Benefits Custom Domain

1. **Branding**: URL lebih profesional dan memorable
2. **Flexibility**: Bisa pindah provider tanpa update semua URLs
3. **SSL**: Cloudflare auto-provision SSL cert
4. **Cache**: Cloudflare CDN cache settings bisa di-custom
5. **Analytics**: Cloudflare analytics per subdomain

**Trade-off**: Setup tambahan 15-30 menit, tapi worth it untuk long-term.


## 9. Strategi Implementasi

### Strategi: Dual-Run Cutover (Zero Downtime)

**Bukan Big-Bang!** Kita akan:
1. Download semua images dari ImageKit
2. Upload ke R2 (tanpa mengubah DB)
3. Verify semua URLs accessible
4. Database cutover (point URLs ke R2)
5. Soak period 14-30 hari
6. Cleanup ImageKit

### Timeline

| Fase | Duration | Downtime |
|------|----------|----------|
| Setup R2 + Env | 30 menit | 0 |
| Dry Run Test | 15 menit | 0 |
| Migrasi Batch Test (25) | 5 menit | 0 |
| Migrasi Full (1598) | 30-60 menit | 0 |
| Verification | 15 menit | 0 |
| DB Cutover | **5 menit** | **~0** (atomic update) |
| Soak Period | 14-30 hari | 0 |
| Cleanup ImageKit | 10 menit | 0 |

**Total Active Work**: ~2-3 jam
**Total Project Duration**: 14-30 hari (mostly monitoring)

### Rollback Points

1. **Before DB cutover**: Rollback = do nothing, delete R2 files
2. **After DB cutover**: Rollback = SQL UPDATE back to ImageKit URLs (instant)
3. **After ImageKit cleanup**: Rollback = impossible (jangan cleanup terlalu cepat!)

### Risk Mitigation

1. **Manifest File**: Semua URLs (ImageKit + R2) disimpan di `backups/r2-migration-manifest.jsonl`
2. **Dry Run**: Test tanpa mengubah apapun
3. **Batch Test**: Test 25 images dulu sebelum full migration
4. **Verification Script**: Auto-test semua R2 URLs sebelum cutover
5. **Atomic Cutover**: DB update dalam satu transaction
6. **Long Soak Period**: 30 hari sebelum delete ImageKit files


## 10. Perubahan Schema

### Schema Changes: TIDAK ADA! 🎉

Schema `product_images` sudah compatible dari migrasi ImageKit sebelumnya:

```sql
-- Schema sudah ada, tidak perlu migration baru
CREATE TABLE product_images (
  id BIGINT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  image_url TEXT NOT NULL,              -- akan diupdate ke R2 URL
  image_provider TEXT NOT NULL,         -- akan diupdate ke 'r2'
  provider_file_id TEXT,                -- akan diisi dengan R2 object key
  provider_file_path TEXT,              -- sama dengan provider_file_id
  provider_original_url TEXT,           -- untuk rollback ke ImageKit
  migrated_at TIMESTAMPTZ,              -- timestamp migrasi ke R2
  -- ... other fields
);
```

### Data Mapping: ImageKit → R2

| Field | ImageKit Value | R2 Value |
|-------|----------------|----------|
| `image_url` | `https://ik.imagekit.io/sparkstage55/products/<uuid>.<ext>` | `https://media.sparkstage55.com/products/<product_id>/<uuid>.<ext>` |
| `image_provider` | `'imagekit'` | `'r2'` |
| `provider_file_id` | `<imagekit_fileId>` | `products/<product_id>/<uuid>.<ext>` |
| `provider_file_path` | `/products/<uuid>.<ext>` | `products/<product_id>/<uuid>.<ext>` |
| `provider_original_url` | `NULL` (atau old Supabase URL) | **ImageKit URL** (for rollback!) |
| `migrated_at` | `<timestamp dari Supabase → ImageKit>` | **NOW()** (timestamp ImageKit → R2) |

### Important Notes

1. **provider_original_url**: Simpan ImageKit URL lama untuk rollback
2. **provider_file_id**: Di R2, ini adalah S3 object key (full path)
3. **migrated_at**: Update ke timestamp baru untuk audit trail


## 11. Perubahan Kode

### 11.1 Migration Script (NEW)

File: `scripts/r2-migrate-product-images.mjs`

**Fitur**:
- Download images dari ImageKit
- Upload ke R2 via S3 SDK
- Update DB metadata
- Resume capability (jika terputus)
- Batch processing
- Dry-run mode
- Progress tracking

**Usage**:
```bash
# Dry run (no changes)
node scripts/r2-migrate-product-images.mjs --dry-run

# Migrate 25 images (test)
node scripts/r2-migrate-product-images.mjs --batch-size 25 --limit 25

# Migrate all
node scripts/r2-migrate-product-images.mjs

# Resume dari yang terakhir
node scripts/r2-migrate-product-images.mjs --resume

# Specific product
node scripts/r2-migrate-product-images.mjs --only-product-id 123
```

### 11.2 Verification Script (NEW)

File: `scripts/r2-verify-urls.mjs`

**Fitur**:
- Test random sample R2 URLs
- Check HTTP 200 response
- Report broken links
- Generate verification report

**Usage**:
```bash
# Verify all migrated URLs
node scripts/r2-verify-urls.mjs

# Verify 50 random samples
node scripts/r2-verify-urls.mjs --sample 50
```

### 11.3 Cutover Script (NEW)

File: `scripts/r2-cutover.mjs`

**Fitur**:
- Atomic DB update (all-or-nothing)
- Dry-run mode
- Backup ImageKit URLs before cutover
- Rollback capability

**Usage**:
```bash
# Dry run (preview changes)
node scripts/r2-cutover.mjs --dry-run

# Production cutover
node scripts/r2-cutover.mjs --confirm
```


### 11.4 Edge Functions (Future - Untuk Upload Baru)

**File**: `supabase/functions/r2-upload-auth/index.ts`

**Purpose**: Generate presigned URL untuk upload baru ke R2

**Flow**:
```typescript
// Frontend request
const { data } = await supabase.functions.invoke('r2-upload-auth', {
  body: {
    productId: 123,
    fileName: 'abc123.jpg',
    fileType: 'image/jpeg'
  }
});

// Response
{
  presignedUrl: 'https://...',
  publicUrl: 'https://media.sparkstage55.com/products/123/abc123.jpg',
  objectKey: 'products/123/abc123.jpg',
  expiresIn: 300
}
```

**File**: `supabase/functions/r2-delete/index.ts`

**Purpose**: Delete image dari R2 bucket

**Flow**:
```typescript
// Frontend request
await supabase.functions.invoke('r2-delete', {
  body: {
    objectKey: 'products/123/abc123.jpg'
  }
});
```

**⚠️ NOTE**: Edge functions untuk upload/delete baru akan dibuat SETELAH migrasi selesai dan stabil. Untuk saat ini, fokus pada migrasi existing images.

### 11.5 Frontend Changes (Future)

**File**: `frontend/src/utils/uploadProductImage.ts`

**Changes**:
- Ganti ImageKit SDK → R2 presigned PUT request
- Update metadata save logic (`image_provider = 'r2'`)

**File**: `frontend/src/utils/inventoryImage.ts`

**Changes**:
- Add R2 URL detection
- Remove ImageKit transformation (serve as-is dari R2)

**⚠️ NOTE**: Frontend changes akan dilakukan SETELAH migrasi existing images selesai.


## 12. Fase Eksekusi

### Fase 0: Preparation (30 menit)

**Checklist**:
- [ ] Cloudflare R2 bucket created: `sparkstage-public-assets`
- [ ] Public access enabled pada bucket
- [ ] R2 API token created dan tested
- [ ] Custom domain setup (optional tapi recommended)
- [ ] `.env.r2-migration` file configured
- [ ] Dependencies installed: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

**Commands**:
```bash
# Install dependencies
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv

# Copy env template
copy .env.r2-migration.example .env.r2-migration

# Edit env file
notepad .env.r2-migration
```

**Go/No-Go**:
- ❌ Stop jika R2 public access belum enabled
- ❌ Stop jika API token belum di-test
- ❌ Stop jika `.env.r2-migration` belum configured

### Fase 1: Dry Run Test (15 menit)

**Purpose**: Verify script logic tanpa mengubah apapun

**Commands**:
```bash
# Dry run (no uploads, no DB changes)
npm run r2:migrate:dry

# atau
node scripts/r2-migrate-product-images.mjs --dry-run --limit 10
```

**Expected Output**:
```
[DRY RUN] Would migrate 1598 images
[DRY RUN] Sample image #1:
  From: https://ik.imagekit.io/sparkstage55/products/abc123.jpg
  To:   https://media.sparkstage55.com/products/123/abc123.jpg
[DRY RUN] No changes made to database or R2.
```

**Verification**:
- [ ] Script runs without errors
- [ ] URLs look correct (R2 domain, proper path structure)
- [ ] No actual uploads to R2
- [ ] No DB updates

**Go/No-Go**:
- ❌ Stop jika ada errors
- ❌ Stop jika URL format salah
- ✅ Proceed jika dry run clean


### Fase 2: Batch Test Migration (15 menit)

**Purpose**: Test actual upload + DB update dengan sample kecil

**Commands**:
```bash
# Migrate 25 images pertama
npm run r2:migrate:test

# atau
node scripts/r2-migrate-product-images.mjs --batch-size 25 --limit 25 --fail-fast
```

**Expected Output**:
```
[INFO] Starting R2 migration...
[INFO] Found 25 images to migrate (filtered by limit)
[PROGRESS] Batch 1/1 (25 images)
  [1/25] Downloading from ImageKit... ✓
  [1/25] Uploading to R2... ✓
  [1/25] Updating database... ✓
  [2/25] Downloading from ImageKit... ✓
  ...
[SUCCESS] Migrated 25/25 images
[INFO] Manifest saved: backups/r2-migration-manifest.jsonl
```

**Verification**:
```bash
# Check migration status
npm run r2:migrate:status

# Verify URLs accessible
npm run r2:verify -- --sample 25

# Manual check
curl https://media.sparkstage55.com/products/<product_id>/<uuid>.jpg
```

**Database Check**:
```sql
-- Check migrated images
SELECT 
  id, 
  product_id,
  image_provider,
  LEFT(image_url, 50) as url_preview,
  migrated_at
FROM product_images
WHERE image_provider = 'r2'
ORDER BY migrated_at DESC
LIMIT 25;
```

**Website Check**:
1. Buka https://www.sparkstage55.com/products/<product_slug>
2. Pastikan images masih load (dari ImageKit, karena belum cutover)
3. Buka DevTools → Network → filter `media.sparkstage55.com`
4. Seharusnya TIDAK ada request ke R2 (masih ImageKit)

**Go/No-Go**:
- ❌ Stop jika ada upload failures
- ❌ Stop jika URLs tidak accessible
- ❌ Stop jika DB update failed
- ✅ Proceed jika semua 25 images sukses dan verified


### Fase 3: Full Migration (30-60 menit)

**Purpose**: Migrate semua ~1598 images ke R2

**Pre-flight Checklist**:
- [ ] Batch test (25 images) sukses 100%
- [ ] R2 bucket verified accessible
- [ ] Database backup (optional tapi recommended)
- [ ] Window kerja confirmed (off-peak hours)

**Commands**:
```bash
# Migrate semua images
npm run r2:migrate

# atau dengan custom settings
node scripts/r2-migrate-product-images.mjs `
  --batch-size 50 `
  --concurrency 5 `
  --env-file .env.r2-migration

# Monitor progress (terminal baru)
npm run r2:migrate:status
```

**Expected Duration**:
- **Network bagus** (10 Mbps+): ~30 menit
- **Network moderate** (5 Mbps): ~45 menit
- **Network slow** (< 5 Mbps): ~60 menit

**Progress Output**:
```
[INFO] Starting R2 migration...
[INFO] Found 1598 images to migrate
[PROGRESS] Batch 1/32 (50 images) - ETA: 28 minutes
  [1/50] ✓ products/123/abc123.jpg
  [2/50] ✓ products/123/def456.jpg
  ...
[PROGRESS] Batch 2/32 (50 images) - ETA: 26 minutes
  ...
[SUCCESS] Migrated 1598/1598 images in 32 minutes
[INFO] Success: 1598, Failed: 0, Skipped: 0
[INFO] Manifest: backups/r2-migration-manifest.jsonl
```

**Resume on Failure**:
```bash
# Jika terputus/error, resume otomatis
npm run r2:migrate

# Atau force resume dari checkpoint
node scripts/r2-migrate-product-images.mjs --resume
```

**Verification**:
```bash
# Check final status
npm run r2:migrate:status

# Expected output:
# Total images: 1598
# Migrated to R2: 1598 (100%)
# Still on ImageKit: 0
# Failed: 0
```

**Go/No-Go**:
- ❌ Stop jika failure rate > 1% (retry failed batch)
- ⚠️ Review jika ada images skipped
- ✅ Proceed jika 100% success rate


### Fase 4: Pre-Cutover Verification (15 menit)

**Purpose**: Verify 100% R2 URLs accessible sebelum DB cutover

**Commands**:
```bash
# Verify semua URLs (sample random 100)
npm run r2:verify

# Verify specific URLs
npm run r2:verify -- --sample 50

# Full verification (all 1598 URLs) - slow!
npm run r2:verify -- --all
```

**Expected Output**:
```
[INFO] Verifying R2 URLs...
[INFO] Testing 100 random samples from 1598 images
[PROGRESS] Checking URLs... (10/100)
  ✓ https://media.sparkstage55.com/products/123/abc.jpg [200 OK]
  ✓ https://media.sparkstage55.com/products/124/def.jpg [200 OK]
  ...
[SUCCESS] 100/100 URLs accessible (100%)
[INFO] All URLs verified successfully!
```

**Manual Verification** (Recommended):
```bash
# Test 10 random URLs manually
curl -I https://media.sparkstage55.com/products/123/abc123.jpg
# Expected: HTTP/2 200

curl -I https://media.sparkstage55.com/products/456/def456.webp
# Expected: HTTP/2 200
```

**Cloudflare R2 Dashboard Check**:
1. Login Cloudflare Dashboard → R2
2. Bucket: `sparkstage-public-assets`
3. Navigate folder: `products/`
4. Verify jumlah objects: **~1598 files**

**Database Pre-Cutover State**:
```sql
-- Semua images masih pointing ke ImageKit
SELECT image_provider, COUNT(*) 
FROM product_images 
GROUP BY image_provider;

-- Expected:
-- imagekit | 1598
```

**Go/No-Go for Cutover**:
- ❌ Stop jika ada URLs tidak accessible
- ❌ Stop jika R2 bucket object count tidak match (1598)
- ❌ Stop jika verification script error
- ✅ GO untuk cutover jika 100% URLs verified


### Fase 5: Database Cutover (5 menit) ⚠️ CRITICAL

**Purpose**: Point semua `product_images` ke R2 URLs (atomic update)

**⚠️ WARNING**: Ini adalah **point of no return** (sampai rollback dijalankan). Setelah cutover, website akan serve images dari R2, bukan ImageKit.

**Pre-Cutover Final Checklist**:
- [ ] 100% URLs verified accessible
- [ ] R2 bucket object count = 1598
- [ ] ImageKit subscription masih aktif (untuk rollback)
- [ ] Backup DB atau snapshot (optional)
- [ ] Off-peak hours window
- [ ] Siap monitor website selama 15-30 menit pasca-cutover

**Commands**:
```bash
# DRY RUN FIRST! (preview changes tanpa execute)
npm run r2:cutover:dry

# Expected output:
# [DRY RUN] Would update 1598 rows:
#   UPDATE product_images SET
#     image_url = (R2 URL),
#     image_provider = 'r2',
#     provider_original_url = (ImageKit URL),
#     migrated_at = NOW()
#   WHERE image_provider = 'imagekit'
# [DRY RUN] No changes made.
```

**Production Cutover**:
```bash
# PRODUCTION CUTOVER (confirm 3x!)
npm run r2:cutover:confirm

# Script akan confirm:
# ⚠️  WARNING: This will update 1598 rows in production database!
# ⚠️  All product images will switch from ImageKit to R2.
# ⚠️  Type 'CONFIRM CUTOVER' to proceed: _

# Type: CONFIRM CUTOVER
```

**Expected Output**:
```
[INFO] Starting production cutover...
[INFO] Backup ImageKit URLs to provider_original_url... ✓
[INFO] Updating 1598 rows in transaction...
[SUCCESS] Database cutover completed!
[INFO] Updated 1598 rows in 2.3 seconds
[INFO] Verification: 1598/1598 rows now point to R2
```

**Immediate Post-Cutover Verification (DALAM 5 MENIT!)**:
```bash
# 1. Check database
SELECT image_provider, COUNT(*) 
FROM product_images 
GROUP BY image_provider;

# Expected:
-- r2 | 1598

# 2. Verify URLs still work
npm run r2:verify -- --sample 50
```

**Website Check (CRITICAL - DALAM 10 MENIT!)**:
1. Clear browser cache atau gunakan Incognito
2. Buka https://www.sparkstage55.com
3. Homepage → Check images load
4. Shop page → Scroll, check product thumbnails
5. Product detail → Check multiple products
6. DevTools → Network → Filter images:
   - **✅ Expected**: `media.sparkstage55.com` (R2)
   - **❌ Wrong**: `ik.imagekit.io` (ImageKit)
7. Check for broken images (empty boxes, 404)

**Go/No-Go**:
- ❌ **ROLLBACK** jika > 5 broken images ditemukan
- ❌ **ROLLBACK** jika homepage tidak load images
- ✅ **PROCEED** jika 0-2 broken images (investigate specific items)


### Fase 6: Soak Period (14-30 hari)

**Purpose**: Monitor production stability sebelum cleanup ImageKit

**Duration**: 
- **Minimum**: 14 hari (2 minggu)
- **Recommended**: 30 hari (1 bulan)

**Daily Monitoring Checklist**:
- [ ] Website images load correctly (spot check 5-10 random products)
- [ ] No customer complaints tentang missing images
- [ ] Cloudflare R2 metrics: bandwidth + requests
- [ ] ImageKit metrics: bandwidth should drop to < 1 GB/month
- [ ] R2 cost: should be ~$0.015/month (storage only)

**Week 1 Monitoring (Intensive)**:
```bash
# Daily check
npm run r2:verify -- --sample 20

# Check DB consistency
SELECT 
  image_provider, 
  COUNT(*),
  COUNT(DISTINCT product_id) as products
FROM product_images 
GROUP BY image_provider;

# Expected:
-- r2 | 1598 | ~500
```

**Week 2-4 Monitoring (Weekly)**:
- [ ] Monday: Spot check 10 random products
- [ ] Friday: Run verification script
- [ ] End of week: Review Cloudflare analytics

**Metrics to Track**:

| Metric | Target | Source |
|--------|--------|--------|
| Broken images | 0 | Manual testing |
| R2 bandwidth cost | **$0** | Cloudflare dashboard |
| R2 storage cost | ~$0.015/mo | Cloudflare dashboard |
| ImageKit bandwidth | < 1 GB/mo | ImageKit dashboard |
| Customer complaints | 0 | Support tickets |

**Red Flags** (Rollback Consideration):
- ❌ Broken images > 10 reported
- ❌ R2 URLs returning 403/404 errors consistently
- ❌ ImageKit bandwidth tidak turun (sign of fallback usage)
- ❌ Customer complaints increasing

**Green Signals** (Ready for Cleanup):
- ✅ Zero broken images selama 14+ hari
- ✅ ImageKit bandwidth < 1 GB/month
- ✅ R2 bandwidth cost = $0
- ✅ No customer complaints
- ✅ All verification scripts passing


### Fase 7: ImageKit Cleanup (10 menit)

**⚠️ FINAL WARNING**: Setelah delete files dari ImageKit, rollback menjadi SANGAT SULIT (hanya bisa via backup lokal). Pastikan soak period 30 hari sudah lewat dan semua green signals terpenuhi!

**Pre-Cleanup Checklist**:
- [ ] Soak period minimal 30 hari completed
- [ ] Zero broken images selama soak period
- [ ] ImageKit bandwidth < 1 GB/month (legacy access only)
- [ ] Backup local copy of manifest: `backups/r2-migration-manifest.jsonl`
- [ ] Backup ImageKit files (optional, jika ImageKit punya export feature)

**Step 7.1: Downgrade ImageKit Plan**

1. Login [ImageKit Dashboard](https://imagekit.io)
2. Settings → Billing
3. **Downgrade ke Free Plan** (jangan cancel subscription dulu!)
4. Konfirm downgrade
5. Verify: Bandwidth limit kembali ke 20 GB/month

**Monitor selama 7 hari** dengan Free Plan:
- Jika bandwidth usage < 1 GB/week → Aman untuk cancel
- Jika bandwidth usage masih > 5 GB/week → Ada yang salah (investigate!)

**Step 7.2: Delete ImageKit Files (Optional)**

**⚠️ NOTE**: Menghapus files dari ImageKit TIDAK wajib. Jika ada space, biarkan files tetap ada sebagai emergency backup. ImageKit Free Plan = 20 GB storage, cukup untuk backup.

Jika tetap ingin delete:
```bash
# List ImageKit files
npm run imagekit:list

# Delete batch (hati-hati!)
npm run imagekit:delete -- --confirm
```

**Step 7.3: Cancel ImageKit Subscription (After 7-14 days on Free)**

1. ImageKit Dashboard → Settings → Billing
2. **Cancel Subscription**
3. Konfirm cancellation
4. Save confirmation email

**🎉 SUCCESS**: Officially saving **$9/month = $108/year**!


## 13. Test Matrix

Test semua scenarios sebelum dan setelah cutover:

### Pre-Cutover Tests

| # | Scenario | Expected Result | Status |
|---|----------|-----------------|--------|
| 1 | Homepage loads | Images from ImageKit | ☐ |
| 2 | Shop page loads | All thumbnails visible (ImageKit) | ☐ |
| 3 | Product detail page | Multiple images load (ImageKit) | ☐ |
| 4 | Admin inventory page | Thumbnails load (ImageKit) | ☐ |
| 5 | Upload new product image | Upload to ImageKit (legacy flow) | ☐ |
| 6 | Delete product image | Delete from ImageKit | ☐ |
| 7 | R2 URLs accessible | All migrated images accessible | ☐ |
| 8 | R2 bucket object count | 1598 files | ☐ |

### Post-Cutover Tests (CRITICAL - Test dalam 15 menit!)

| # | Scenario | Expected Result | Status |
|---|----------|-----------------|--------|
| 1 | Homepage loads | Images from **R2** (`media.sparkstage55.com`) | ☐ |
| 2 | Shop page loads | All thumbnails visible (**R2**) | ☐ |
| 3 | Product detail page | Multiple images load (**R2**) | ☐ |
| 4 | Image zoom/lightbox | Works correctly with R2 URLs | ☐ |
| 5 | Admin inventory page | Thumbnails load from **R2** | ☐ |
| 6 | Mobile website | Images load on mobile (3G/4G) | ☐ |
| 7 | DevTools Network tab | All image requests to `media.sparkstage55.com` | ☐ |
| 8 | Check for 404/403 | No broken image links | ☐ |
| 9 | Multiple product categories | Test across different categories | ☐ |
| 10 | Browser cache clear | Images load after cache clear | ☐ |

### Soak Period Tests (Weekly)

| # | Scenario | Frequency | Status |
|---|----------|-----------|--------|
| 1 | Random 10 products | Weekly | ☐ |
| 2 | Cloudflare R2 analytics | Weekly | ☐ |
| 3 | ImageKit bandwidth check | Weekly | ☐ |
| 4 | Customer support tickets | Daily | ☐ |
| 5 | Full verification script | Bi-weekly | ☐ |


## 14. Rollback Plan

### Rollback Window 1: Sebelum Cutover (Easy - 5 menit)

**Scenario**: Migrasi files ke R2 ada masalah, cutover belum dilakukan

**Action**: Do nothing! Database masih pointing ke ImageKit.

**Cleanup**:
```bash
# Optional: Delete R2 test files
# (hanya jika mau cleanup, tidak wajib)
```

**Impact**: Zero impact, website tetap jalan normal

---

### Rollback Window 2: Setelah Cutover, Dalam Soak Period (Medium - 10 menit)

**Scenario**: Broken images ditemukan setelah cutover, ImageKit files masih ada

**Pre-requisites**:
- ImageKit files belum dihapus
- ImageKit subscription masih aktif
- `provider_original_url` field populated

**Step-by-Step Rollback**:

```sql
-- 1. Backup current state (just in case)
CREATE TABLE product_images_r2_backup AS
SELECT * FROM product_images WHERE image_provider = 'r2';

-- 2. Rollback ke ImageKit URLs (atomic transaction)
BEGIN;

UPDATE product_images
SET 
  image_url = provider_original_url,
  image_provider = 'imagekit',
  provider_file_id = NULL,  -- clear R2 object key
  migrated_at = NULL         -- clear R2 migration timestamp
WHERE image_provider = 'r2' 
  AND provider_original_url IS NOT NULL;

-- 3. Verify rollback
SELECT image_provider, COUNT(*) 
FROM product_images 
GROUP BY image_provider;
-- Expected: imagekit | 1598

COMMIT;
```

**Post-Rollback Verification** (IMMEDIATE!):
```bash
# 1. Test website
# Homepage, Shop, Product Detail → Images harus dari ImageKit lagi

# 2. DevTools Network → Filter images
# Expected: ik.imagekit.io (NOT media.sparkstage55.com)

# 3. Check database
SELECT 
  image_provider, 
  COUNT(*),
  COUNT(NULLIF(provider_original_url, '')) as has_backup
FROM product_images 
GROUP BY image_provider;
```

**Duration**: ~10 menit (SQL update + verification)

**Impact**: 
- ~5 menit website might show mixed ImageKit + R2 (during SQL update)
- After rollback: 100% ImageKit (stable)

---

### Rollback Window 3: Setelah ImageKit Cleanup (Hard - 60+ menit)

**Scenario**: ImageKit files sudah dihapus, butuh rollback urgent

**Pre-requisites**:
- Backup manifest: `backups/r2-migration-manifest.jsonl`
- R2 files masih ada
- Database `provider_original_url` masih tersimpan

**Step-by-Step Rollback**:

```bash
# 1. Re-upload dari R2 ke ImageKit (reverse migration)
node scripts/r2-to-imagekit-rollback.mjs

# Expected duration: 30-45 menit

# 2. Database rollback
# (sama dengan Rollback Window 2)
```

**Duration**: ~60 menit (re-upload 1598 images + SQL)

**Impact**: 
- 60+ menit downtime atau broken images
- High stress, not recommended!

**Prevention**: DON'T delete ImageKit files sampai 30 hari soak period!


## 15. Monitoring

### Cloudflare R2 Metrics

**Dashboard**: Cloudflare → R2 → Bucket → Analytics

**Key Metrics**:
1. **Storage Used**: Should be ~2-3 GB
2. **Total Objects**: Should be ~1598 files
3. **Class A Operations** (PUT/POST/LIST): Should drop to ~0 after migration complete
4. **Class B Operations** (GET/HEAD): Ongoing traffic (user requests)
5. **Egress Bandwidth**: Should show traffic BUT **cost = $0**

**Expected Values**:
```
Storage: 2.8 GB × $0.015/GB = $0.042/month
Class A Ops: 0 (after migration)
Class B Ops: ~50K-100K/month (depends on traffic)
Egress: 15-25 GB/month × $0 = $0
```

**Total Cost**: **~$0.04/month** (vs $9/month ImageKit)

### ImageKit Metrics (During Soak Period)

**Dashboard**: ImageKit → Analytics

**Key Metrics**:
1. **Bandwidth Used**: Should drop from 20+ GB → < 1 GB/month
2. **Media Delivered**: Should drop significantly
3. **Storage Used**: Unchanged (files still there)

**Expected Timeline**:
- **Day 1-7**: 15-20 GB (cached/bot traffic)
- **Day 8-14**: 5-10 GB (cache expiring)
- **Day 15-30**: < 1 GB (legacy links only)

### Website Performance Monitoring

**Tools**:
1. **Google PageSpeed Insights**: Check LCP (Largest Contentful Paint)
2. **Cloudflare Web Analytics**: Track page load times
3. **Manual Testing**: Chrome DevTools → Network tab

**Baseline Metrics** (ImageKit):
- LCP: ~1.5-2.0s
- Image load time: ~300-500ms
- Total page weight: ~2-3 MB

**Target Metrics** (R2):
- LCP: ~1.5-2.0s (same or better)
- Image load time: ~300-500ms (same)
- Total page weight: ~2-3 MB (unchanged)

**⚠️ Red Flag**: Jika LCP > 3s atau image load time > 1s → Investigate R2 CDN caching

### Database Monitoring

```sql
-- Daily check (during first 2 weeks)
SELECT 
  image_provider,
  COUNT(*) as total_images,
  COUNT(DISTINCT product_id) as total_products,
  COUNT(NULLIF(provider_original_url, '')) as has_rollback_url,
  MIN(migrated_at) as first_migration,
  MAX(migrated_at) as last_migration
FROM product_images
GROUP BY image_provider
ORDER BY image_provider;
```

**Expected Output** (post-cutover):
```
image_provider | total_images | total_products | has_rollback_url | first_migration | last_migration
r2             | 1598         | ~500           | 1598             | 2026-06-09      | 2026-06-09
```


## 16. Cleanup

### Cleanup Phase 1: Local Files (After Migration Complete)

**Files to Keep** (permanent archive):
```
backups/
├── r2-migration-manifest.jsonl         # Master record: ImageKit → R2 mapping
├── r2-migration-summary.json           # High-level stats
└── r2-migration-failed.jsonl           # Failed migrations (if any)
```

**Files to Delete** (temporary working files):
```
backups/
├── r2-temp/                            # Downloaded images dari ImageKit
└── r2-migration-progress.json          # Resume checkpoint (not needed after complete)
```

**Commands**:
```bash
# Keep manifest, delete temps
Remove-Item -Recurse backups/r2-temp
Remove-Item backups/r2-migration-progress.json
```

### Cleanup Phase 2: ImageKit Files (After 30 Days Soak)

**Pre-Cleanup Checklist** (ALL must be ✅):
- [ ] 30 hari soak period completed
- [ ] Zero broken images during soak
- [ ] ImageKit bandwidth < 1 GB/month
- [ ] Cloudflare R2 stable (no issues)
- [ ] Manifest backup saved securely

**Option A: Keep Files (Recommended)**

ImageKit Free Plan = 20 GB storage. Jika files kamu < 20 GB, **JANGAN HAPUS**. Keep as free emergency backup.

**Option B: Delete Files (Advanced)**

```bash
# List ImageKit files to delete
node scripts/imagekit-list-files.mjs --folder /products

# Delete batch dengan confirmation
node scripts/imagekit-delete-files.mjs --folder /products --confirm

# ⚠️ WARNING: PERMANENT! Cannot undo!
```

### Cleanup Phase 3: Cancel ImageKit Subscription (After 37+ Days)

**Timeline**:
1. Day 30: Downgrade to Free Plan
2. Day 30-37: Monitor bandwidth (should be < 1 GB/week)
3. Day 37+: Cancel subscription if bandwidth stable

**Steps**:
1. ImageKit Dashboard → Settings → Billing
2. Review current usage (should be minimal)
3. Click **Cancel Subscription**
4. Reason: "Migrated to alternative CDN"
5. Confirm cancellation
6. **Save confirmation email** for records

**🎉 CELEBRATION**: You're now saving **$9/month = $108/year**!

### Cleanup Phase 4: Code Cleanup (Future)

**After ImageKit fully deprecated**:

Files to update:
```
frontend/src/utils/uploadProductImage.ts    # Remove ImageKit SDK
frontend/src/utils/inventoryImage.ts        # Remove ImageKit fallback
supabase/functions/imagekit-auth/           # Archive or delete
supabase/functions/imagekit-delete/         # Archive or delete
package.json                                # Remove @imagekit/javascript
```

**⚠️ NOTE**: Don't rush this cleanup. Keep ImageKit code/functions for 6-12 months sebagai reference atau emergency fallback.


## 17. Definisi Done

Migrasi dianggap **SELESAI dan SUKSES** jika semua kriteria terpenuhi:

### Technical Criteria

- [x] **Setup R2**: Bucket created, public access enabled, API tokens configured
- [ ] **Migration Script**: Script tested dan verified (dry-run + batch test)
- [ ] **Full Migration**: 1598/1598 images uploaded ke R2 (100% success rate)
- [ ] **Pre-Cutover Verification**: All R2 URLs tested dan accessible
- [ ] **Database Cutover**: All `product_images` pointing ke R2 URLs
- [ ] **Post-Cutover Verification**: Website tested, zero broken images
- [ ] **Soak Period**: 30 hari monitoring tanpa critical issues
- [ ] **Manifest Backup**: `r2-migration-manifest.jsonl` archived securely

### Business Criteria

- [ ] **Cost Savings**: ImageKit subscription cancelled, saving $9/month
- [ ] **Zero Downtime**: No production outage during migration
- [ ] **User Experience**: No customer complaints tentang missing/slow images
- [ ] **Performance**: Image load times sama atau lebih baik dari ImageKit
- [ ] **Bandwidth Cost**: Cloudflare R2 egress cost = $0/month

### Documentation Criteria

- [x] **Migration Runbook**: Complete documentation (this file)
- [x] **Quick Start Guide**: `R2_MIGRATION_QUICKSTART.md` created
- [ ] **Manifest Archive**: Migration records saved untuk audit trail
- [ ] **AGENTS.md Updated**: Add R2 migration status to repo memory
- [ ] **Architecture Docs**: Update `docs/architecture.md` dengan R2 info

### Rollback Criteria

- [ ] **ImageKit Backup**: Files kept di ImageKit minimal 30 hari
- [ ] **Rollback Tested**: Rollback procedure documented dan understood
- [ ] **Emergency Plan**: Team knows how to rollback jika ada critical issue

---

## 🎉 Success Metrics

| Metric | Before (ImageKit) | After (R2) | Improvement |
|--------|------------------|------------|-------------|
| **Monthly Cost** | $9 | **$0.04** | **-99.6%** |
| **Annual Cost** | $108 | **$0.48** | **Save $107.52/year** |
| **Egress Cost** | Included | **$0** | Zero egress! |
| **Bandwidth Limit** | 20 GB/month | **Unlimited** | No overage fees |
| **Setup Complexity** | ⭐⭐ | ⭐⭐⭐ | More complex setup |
| **Maintenance** | Low | **Very Low** | Set and forget |

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: R2 URLs return 403 Forbidden**
```
Cause: Public access not enabled
Fix: R2 Dashboard → Bucket Settings → Enable Public Access
```

**Issue 2: Images load slow setelah cutover**
```
Cause: Cloudflare CDN belum cache
Fix: Wait 24-48 jam, CDN akan auto-cache frequently accessed files
Optional: Manually purge cache dan re-fetch
```

**Issue 3: Some images 404 di R2**
```
Cause: Migration script failed untuk beberapa files
Fix: Re-run migration script dengan --resume flag
```

**Issue 4: ImageKit bandwidth masih tinggi setelah cutover**
```
Cause: Cached URLs atau bot traffic
Fix: Wait 7-14 hari untuk cache expiry
Check: Verify database semua rows pointing ke R2
```

### Contact & Escalation

- **Migration Script Issues**: Check `backups/r2-migration-failed.jsonl`
- **R2 API Issues**: Cloudflare Support (Business Plan+ only)
- **Critical Production Issue**: Execute rollback plan immediately

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-09  
**Author**: Kiro AI Agent  
**Status**: Ready for Execution

