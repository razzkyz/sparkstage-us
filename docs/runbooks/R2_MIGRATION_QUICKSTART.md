# Cloudflare R2 Migration - Quick Start Guide

Panduan singkat untuk migrasi ImageKit → Cloudflare R2 tanpa downtime.

## 🎯 Tujuan

Menghemat **$9/bulan** biaya ImageKit dengan pindah ke Cloudflare R2 (zero egress cost).

## ⚡ Quick Steps

### 1. Setup Cloudflare R2 (15 menit)

1. Login [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. **Create bucket**: `sparkstage-public-assets`
3. **Create API Token**:
   - Permission: `Object Read & Write`
   - Copy: `Account ID`, `Access Key ID`, `Secret Access Key`
4. **Enable Public Access** pada bucket
5. **(Optional)** Setup custom domain: `media.sparkstage55.com`

### 2. Konfigurasi Environment

```bash
# Copy template
copy .env.r2-migration.example .env.r2-migration

# Edit dan isi credentials
notepad .env.r2-migration
```

Isi minimal:
```env
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=sparkstage-public-assets
R2_PUBLIC_BASE_URL=https://media.sparkstage55.com
```

### 3. Test Migration (Dry Run)

```bash
# Test tanpa mengubah apapun
npm run r2:migrate:dry
```

✅ **Success** jika muncul rencana migrasi tanpa error.

### 4. Migrasi Batch Test (25 images)

```bash
# Migrate 25 images pertama
npm run r2:migrate -- --batch-size 25 --limit 25

# Verify URLs accessible
npm run r2:verify
```

✅ **Success** jika semua URL test bisa diakses.

### 5. Migrasi Full

```bash
# Migrate semua images (~30-60 menit untuk 2000+ images)
npm run r2:migrate

# Monitor progress (terminal baru)
npm run r2:migrate:status
```

**Resume otomatis**: Jika terputus, jalankan command yang sama lagi.

### 6. Soak Period (24-48 jam)

**Checklist**:
- [ ] Test 20-30 random URLs dari manifest
- [ ] Buka website, pastikan images masih load dari ImageKit (belum cutover)
- [ ] Monitor R2 dashboard, pastikan files ada
- [ ] Test dari mobile & desktop
- [ ] Pastikan ImageKit subscription masih aktif

### 7. Database Cutover

```bash
# Dry run cutover (test tanpa update DB)
npm run r2:cutover:dry

# PRODUCTION CUTOVER (point of no return!)
npm run r2:cutover:confirm
```

**Immediate Check** (dalam 5 menit):
1. Buka https://www.sparkstage55.com
2. Test: Homepage, Shop, Product Detail, Admin Inventory
3. DevTools → Network → pastikan images dari `media.sparkstage55.com`
4. Check for broken images

### 8. Monitoring (7-14 hari)

Monitor daily:
- Website images load dengan benar
- Cloudflare R2 metrics (bandwidth = $0)
- ImageKit bandwidth drop to ~0

### 9. Cleanup (Setelah 14 hari stable)

```bash
# Cancel ImageKit subscription
# Save $9/month! 💰
```

## 🚨 Rollback (Jika Ada Masalah)

```sql
-- Rollback ke ImageKit URLs
UPDATE product_images
SET 
  image_url = provider_original_url,
  image_provider = 'imagekit'
WHERE image_provider = 'r2' 
  AND provider_original_url IS NOT NULL;
```

## 📊 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Monthly Cost | $9 | **$0** |
| ImageKit Bandwidth | 20 GB/5 days | < 1 GB/month |
| R2 Bandwidth Cost | N/A | **$0** (zero egress) |
| Images Load | ik.imagekit.io | media.sparkstage55.com |

## 🔧 Troubleshooting

### Images tidak muncul setelah cutover

```bash
# Check status
npm run r2:migrate:status

# Verify URLs
npm run r2:verify

# Check R2 bucket public access enabled
```

### Migration stuck/gagal

```bash
# Resume dari yang terakhir
npm run r2:migrate

# Check specific product
npm run r2:migrate -- --only-product-id 123

# Skip re-download (use cached)
npm run r2:migrate -- --skip-download
```

## 📚 Full Documentation

Lihat `docs/runbooks/r2-migration.md` untuk dokumentasi lengkap.

## ⚠️ Important Notes

1. **JANGAN hapus ImageKit files** sampai 30 hari setelah cutover stable
2. **JANGAN cancel ImageKit subscription** sampai 14 hari monitoring selesai
3. **BACKUP manifest files** (`backups/r2-migration-manifest.jsonl`)
4. **Test URLs** sebelum cutover production

## 🎉 Success Criteria

- [x] Zero broken images
- [x] ImageKit bandwidth < 1 GB/month
- [x] R2 egress cost = $0
- [x] 14 hari stable
- [x] **Save $9/month!**

## 💡 Pro Tips

- Gunakan `--concurrency 5` untuk migrasi lebih cepat (jika koneksi stabil)
- Monitor R2 dashboard selama migrasi untuk memastikan files terupload
- Keep ImageKit active 30 hari sebagai emergency backup
- Archive migration manifest untuk audit trail

---

**Estimated Total Time**: 2-3 jam (setup + migration + verification)

**Cost Savings**: $9/month = **$108/year** 💰
