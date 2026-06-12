# Cloudflare R2 Migration - Checklist Lengkap

## Phase 0: Persiapan (SEBELUM Coding)

### ✅ Cloudflare Account Setup
- [ ] Login [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] Navigate ke **R2 Object Storage**
- [ ] Verify akun sudah aktif (gratis 10GB storage + zero egress)

### ✅ Create R2 Bucket
- [ ] Klik **Create bucket**
- [ ] Nama bucket: `sparkstage-public-assets`
- [ ] Region: Automatic (atau pilih Asia Pacific untuk latency lebih rendah)
- [ ] Create bucket

### ✅ Generate R2 API Token
- [ ] Klik **Manage R2 API Tokens**
- [ ] Klik **Create API token**
- [ ] Name: `sparkstage-migration`
- [ ] Permissions: **Object Read & Write**
- [ ] TTL: No expiry (atau 1 year)
- [ ] **SIMPAN**:
  - Account ID: `________________`
  - Access Key ID: `________________`
  - Secret Access Key: `________________`

### ✅ Enable Public Access
- [ ] Buka bucket `sparkstage-public-assets`
- [ ] Settings → **Public Access**
- [ ] Enable: "Allow public access"
- [ ] Copy R2.dev URL: `https://pub-xxxxx.r2.dev`

### ✅ (Optional) Custom Domain Setup
- [ ] R2 bucket settings → **Connect domain**
- [ ] Domain: `media.sparkstage55.com`
- [ ] Add CNAME record di Cloudflare DNS:
  ```
  Type: CNAME
  Name: media
  Target: sparkstage-public-assets.xxxxx.r2.cloudflarestorage.com
  Proxy: Yes (orange cloud)
  ```
- [ ] Wait DNS propagation (5-15 menit)
- [ ] Test: `https://media.sparkstage55.com/test.txt`

---

## Phase 1: Environment Setup (5 menit)

### ✅ Copy Environment Template
```bash
copy .env.r2-migration.example .env.r2-migration
```

### ✅ Edit `.env.r2-migration`
```env
# Dari Cloudflare R2 API Token
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here

# Bucket Configuration
R2_BUCKET_NAME=sparkstage-public-assets
R2_BASE_PATH=products

# Public URL
# Option 1: Custom domain (recommended)
R2_PUBLIC_BASE_URL=https://media.sparkstage55.com

# Option 2: R2.dev (untuk testing)
# R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
```

### ✅ Verify Credentials
```bash
# Test connection (akan dibuat scriptnya)
node scripts/test-r2-connection.mjs
```

---

## Phase 2: Dry Run Test (5 menit)

### ✅ Run Dry Run Migration
```bash
npm run r2:migrate:dry
```

**Expected Output**:
```
✓ Connected to R2 bucket: sparkstage-public-assets
✓ Found 1598 product_images with image_provider='imagekit'
✓ Dry run mode: No changes will be made
✓ Estimated migration: 1598 images
✓ Estimated time: 30-45 minutes
```

### ✅ Checklist Dry Run
- [ ] Script runs tanpa error
- [ ] Total images detected: ~1598
- [ ] R2 connection successful
- [ ] No "permission denied" errors

---

## Phase 3: Batch Test (10-15 menit)

### ✅ Migrate 25 Images (Test Batch)
```bash
npm run r2:migrate -- --batch-size 25 --limit 25 --fail-fast
```

### ✅ Verify Uploaded Files
```bash
# Check R2 dashboard
# Should see: products/123/uuid-abc.jpg
```

### ✅ Test URLs
```bash
npm run r2:verify
```

**Expected**:
```
✓ Testing 25 URLs...
✓ 25/25 URLs accessible (200 OK)
✓ Average response time: 180ms
```

### ✅ Manual Spot Check
- [ ] Copy 3 random R2 URLs dari manifest
- [ ] Buka di browser (incognito mode)
- [ ] Images load dengan benar
- [ ] Check HTTPS certificate valid

---

## Phase 4: Full Migration (30-60 menit)

### ✅ Backup Current State
```bash
# Backup product_images table
npm run supabase:db:backup -- product_images

# Backup manifest ImageKit URLs
node scripts/backup-imagekit-manifest.mjs
```

### ✅ Start Full Migration
```bash
npm run r2:migrate
```

### ✅ Monitor Progress (Terminal baru)
```bash
npm run r2:migrate:status
```

**Expected Output (real-time)**:
```
Migration Progress:
├─ Total: 1598 images
├─ Migrated: 450 (28%)
├─ Failed: 2
├─ Remaining: 1146
└─ ETA: 18 minutes

Recent errors:
  × products/45/xyz.jpg - Network timeout (will retry)
```

### ✅ Checklist During Migration
- [ ] No consistent failures (< 1% error rate OK)
- [ ] R2 dashboard shows files uploading
- [ ] Database `product_images` belum berubah (masih ImageKit)
- [ ] Script auto-resume jika crash

---

## Phase 5: Verification (15 menit)

### ✅ Check Migration Status
```bash
npm run r2:migrate:status
```

**Expected**:
```
✓ Migration Complete!
├─ Total migrated: 1598/1598 (100%)
├─ Failed: 0
├─ R2 storage used: ~1.2 GB
└─ All files verified accessible
```

### ✅ Verify Database State
```sql
-- Should show image_provider still 'imagekit'
SELECT image_provider, COUNT(*) 
FROM product_images 
GROUP BY image_provider;

-- Expected: imagekit=1598, r2=0 (belum cutover)
```

### ✅ Test Random URLs
```bash
# Test 50 random R2 URLs
npm run r2:verify -- --sample-size 50
```

---

## Phase 6: Soak Period (24-48 jam)

### ✅ Daily Monitoring
- [ ] Day 1: Test 20 URLs, check website images
- [ ] Day 2: Test 20 URLs, check admin inventory
- [ ] Verify R2 files tetap accessible
- [ ] Verify ImageKit subscription still active (backup!)

### ✅ Production Test Checklist
- [ ] Homepage: All product images load (dari ImageKit masih)
- [ ] Shop page: Thumbnails load
- [ ] Product detail: All images load
- [ ] Admin inventory: Image upload works
- [ ] Mobile: Images responsive
- [ ] Network tab: Latency < 500ms

---

## Phase 7: Database Cutover (CRITICAL - 5 menit)

⚠️ **POINT OF NO RETURN** - Setelah ini, website akan serve dari R2

### ✅ Pre-Cutover Checklist
- [ ] Soak period selesai (24-48 jam)
- [ ] All R2 URLs verified accessible
- [ ] Backup database recent
- [ ] Team notified (siap monitor)
- [ ] Rollback SQL prepared
- [ ] ImageKit subscription masih aktif (emergency backup)

### ✅ Dry Run Cutover
```bash
npm run r2:cutover:dry
```

**Expected**:
```
✓ Dry run: Would update 1598 product_images
✓ Example changes:
  Before: https://ik.imagekit.io/xxx/products/123/abc.jpg
  After:  https://media.sparkstage55.com/products/123/abc.jpg
✓ No database changes made (dry run)
```

### ✅ PRODUCTION CUTOVER
```bash
# Deep breath... 🫁
npm run r2:cutover:confirm
```

**Expected**:
```
✓ Starting cutover...
✓ Updating product_images...
✓ Updated 1598 rows
✓ Cutover complete!

⚠️ IMMEDIATE ACTION REQUIRED:
1. Test website NOW
2. Check for broken images
3. Monitor error logs
```

### ✅ Immediate Post-Cutover Check (5 menit)
- [ ] Homepage loads (force refresh Ctrl+Shift+R)
- [ ] Product images load
- [ ] DevTools Network tab: Images dari `media.sparkstage55.com`
- [ ] No 404 errors
- [ ] Mobile responsive check
- [ ] Admin inventory thumbnail works

---

## Phase 8: Post-Cutover Monitoring (7-14 hari)

### ✅ Day 1-3: Intensive Monitoring
- [ ] Check website 3x per day
- [ ] Monitor R2 bandwidth (should be active)
- [ ] Monitor ImageKit bandwidth (should drop to ~0)
- [ ] Check error logs for 404s
- [ ] Spot test 20+ products daily

### ✅ Day 4-7: Regular Monitoring
- [ ] Check website 1x per day
- [ ] Compare R2 vs ImageKit bandwidth
- [ ] User feedback monitoring
- [ ] Performance check (Lighthouse)

### ✅ Day 8-14: Stability Check
- [ ] Weekly check
- [ ] ImageKit bandwidth < 1 GB total
- [ ] R2 egress cost = $0 ✅
- [ ] No reported image issues

---

## Phase 9: Cleanup (Setelah 14 hari stable)

### ✅ Pre-Cleanup Checklist
- [ ] 14 hari monitoring selesai
- [ ] Zero broken images reported
- [ ] ImageKit bandwidth < 1 GB/month
- [ ] R2 serving all images successfully
- [ ] Team confident dengan R2

### ✅ ImageKit Cleanup
- [ ] Download backup semua ImageKit files (optional paranoid backup)
- [ ] Cancel ImageKit subscription
- [ ] **💰 Save $9/month = $108/year!**

### ✅ Archive Migration Artifacts
```bash
# Compress migration logs
tar -czf backups/r2-migration-archive-$(date +%Y%m%d).tar.gz backups/r2-*.jsonl
```

---

## 🚨 Rollback Plan

### Immediate Rollback (Jika cutover gagal)
```sql
-- Rollback ke ImageKit URLs
UPDATE product_images
SET 
  image_url = provider_original_url,
  image_provider = 'imagekit'
WHERE image_provider = 'r2' 
  AND provider_original_url IS NOT NULL;

-- Verify rollback
SELECT image_provider, COUNT(*) FROM product_images GROUP BY image_provider;
-- Expected: imagekit=1598
```

### Rollback Partial (Jika hanya sebagian images bermasalah)
```sql
-- Rollback specific product
UPDATE product_images
SET 
  image_url = provider_original_url,
  image_provider = 'imagekit'
WHERE image_provider = 'r2' 
  AND product_id = 123;
```

---

## 📊 Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Migration Success Rate | 100% | ___% |
| Broken Images Post-Cutover | 0 | ___ |
| R2 Egress Cost | $0 | $__ |
| ImageKit Cost Savings | $9/month | $__ |
| Page Load Time Change | < +10% | ___% |
| 14-Day Stability | Zero issues | ___ issues |

---

## ⏱️ Time Estimates

| Phase | Time |
|-------|------|
| Cloudflare Setup | 15-20 min |
| Environment Config | 5 min |
| Dry Run Test | 5 min |
| Batch Test | 10-15 min |
| Full Migration | 30-60 min |
| Verification | 15 min |
| Soak Period | 24-48 hours |
| Cutover | 5 min |
| Post-Cutover Check | 5 min |
| **Total Active Time** | **~2-3 hours** |

---

## 🎯 Definition of Done

Migrasi dianggap **SELESAI** jika:

- [x] Semua images (1598) uploaded ke R2
- [x] Database cutover berhasil
- [x] Zero broken images
- [x] 14 hari monitoring stable
- [x] ImageKit bandwidth < 1 GB/month
- [x] R2 egress cost = $0
- [x] ImageKit subscription canceled
- [x] **Cost savings: $9/month achieved** 💰

---

**Last Updated**: 2026-06-09  
**Status**: Ready to start Phase 0
