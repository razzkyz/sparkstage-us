# 🚀 R2 Migration - Pre-Flight Checklist

**Target**: Migrasi 1,598 product images dari ImageKit → Cloudflare R2  
**Expected Duration**: 2-3 jam (active work)  
**Expected Savings**: $107.23/year  

---

## ✅ FASE 0: PERSIAPAN (Sebelum Mulai)

### A. Akun & Akses (15 menit)

- [ ] **Cloudflare Account**
  - Login: https://dash.cloudflare.com
  - Verify account active
  - R2 access enabled (bisa akses menu R2)

- [ ] **Supabase Access**
  - CLI installed: `supabase --version`
  - Logged in: `supabase projects list`
  - Linked to project: `supabase status`
  - Service role key tersedia

- [ ] **ImageKit Account** (existing)
  - Account masih aktif
  - Verify current usage: ~1,598 images
  - Bandwidth usage: Cek dashboard (seharusnya > 20 GB/month)

### B. Cloudflare R2 Setup (30 menit)

#### Step 1: Create Bucket

- [ ] Login Cloudflare Dashboard → R2
- [ ] Click **Create bucket**
- [ ] Bucket name: `sparkstage-public-assets`
- [ ] Location: **Automatic**
- [ ] Click **Create bucket**

#### Step 2: Enable Public Access ⚠️ CRITICAL!

- [ ] Masuk ke bucket `sparkstage-public-assets`
- [ ] Tab **Settings**
- [ ] Section **Public access**
- [ ] Click **Allow Access**
- [ ] Centang "I understand..."
- [ ] Click **Allow Access**
- [ ] Status berubah: ✅ **Public access: Enabled**
- [ ] **COPY** Public Bucket URL:
  ```
  https://<account_id>.r2.cloudflarestorage.com
  ```

#### Step 3: Create API Token

- [ ] R2 Dashboard → **Manage R2 API Tokens**
- [ ] Click **Create API Token**
- [ ] Token name: `sparkstage-r2-migration`
- [ ] Permissions: **Object Read & Write**
- [ ] TTL: **Forever** (atau 1 year)
- [ ] Bucket scope: **Apply to specific buckets only**
  - Select: `sparkstage-public-assets`
- [ ] Click **Create API Token**
- [ ] **COPY dan SIMPAN** (tidak bisa dilihat lagi!):
  ```
  Account ID: _____________________
  Access Key ID: _____________________
  Secret Access Key: _____________________
  ```

#### Step 4: Test R2 Connection

- [ ] Upload test file via R2 UI:
  - Bucket → Upload → Select any image → Upload
- [ ] Test public URL:
  ```powershell
  curl -I https://<account_id>.r2.cloudflarestorage.com/<filename>
  ```
- [ ] Expected: `HTTP/2 200` ✅

### C. Custom Domain Setup (OPTIONAL tapi RECOMMENDED - 15 menit)

- [ ] R2 Bucket → Settings → **Custom Domains**
- [ ] Click **Connect Domain**
- [ ] Enter: `media.sparkstage55.com`
- [ ] Click **Continue**
- [ ] Verify DNS CNAME created (auto jika domain di Cloudflare)
- [ ] Wait 2-5 menit
- [ ] Test custom domain:
  ```powershell
  curl -I https://media.sparkstage55.com/<filename>
  ```
- [ ] Expected: `HTTP/2 200` via Cloudflare CDN ✅

**Jika tidak setup custom domain**: Gunakan R2 default URL (OK untuk testing)

---

## ✅ FASE 1: ENVIRONMENT & DEPENDENCIES (10 menit)

### A. Install Dependencies

- [ ] Check current Node.js version:
  ```powershell
  node --version
  ```
  Expected: `v18+` atau `v20+`

- [ ] Install AWS SDK (untuk R2):
  ```powershell
  npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```

- [ ] Install dotenv (jika belum):
  ```powershell
  npm install dotenv
  ```

- [ ] Verify scripts exist:
  ```powershell
  dir scripts\migrate-imagekit-to-r2.mjs
  dir scripts\r2-migration-status.mjs
  dir scripts\verify-r2-urls.mjs
  dir scripts\r2-cutover-database.mjs
  ```

### B. Configure Environment File

- [ ] File `.env.r2-migration` sudah ada (checked!)
- [ ] Update dengan credentials dari Step B3:
  ```env
  R2_ACCOUNT_ID=<your_account_id>
  R2_ACCESS_KEY_ID=<your_access_key_id>
  R2_SECRET_ACCESS_KEY=<your_secret_access_key>
  R2_BUCKET_NAME=sparkstage-public-assets
  R2_BASE_PATH=products
  
  # Pilih salah satu:
  # Option 1: R2 default URL
  R2_PUBLIC_BASE_URL=https://<account_id>.r2.cloudflarestorage.com
  
  # Option 2: Custom domain (jika sudah setup)
  # R2_PUBLIC_BASE_URL=https://media.sparkstage55.com
  ```

- [ ] Verify `.env.r2-migration` tidak di-commit (check `.gitignore`)

### C. Test R2 Connection via Script

- [ ] Run test script:
  ```powershell
  node scripts\test-r2-connection.mjs
  ```

- [ ] Expected output:
  ```
  ✅ R2 Connection successful!
  Bucket: sparkstage-public-assets
  Account: <account_id>
  Public URL: https://...
  ```

---

## ✅ FASE 2: DRY RUN TEST (15 menit)

### A. Dry Run (No Changes)

- [ ] Run dry run:
  ```powershell
  npm run r2:migrate:dry
  ```

- [ ] Expected output:
  ```
  [DRY RUN] Would migrate 1598 images
  [DRY RUN] Sample #1:
    From: https://ik.imagekit.io/sparkstage55/products/abc.jpg
    To:   https://media.sparkstage55.com/products/123/abc.jpg
  [DRY RUN] No changes made.
  ```

- [ ] Verify:
  - [ ] No errors
  - [ ] URL format correct
  - [ ] Image count ~1598

### B. Migration Status Check

- [ ] Check current status:
  ```powershell
  npm run r2:migrate:status
  ```

- [ ] Expected output:
  ```
  Total images: 1598
  ImageKit: 1598 (100%)
  R2: 0 (0%)
  Ready to migrate: Yes
  ```

---

## ✅ FASE 3: BATCH TEST (15 menit)

### A. Migrate 25 Images (Test Batch)

- [ ] Run batch test:
  ```powershell
  npm run r2:migrate -- --batch-size 25 --limit 25 --fail-fast
  ```

- [ ] Expected output:
  ```
  [INFO] Starting R2 migration...
  [INFO] Found 25 images to migrate
  [PROGRESS] Batch 1/1 (25 images)
    [1/25] ✓ Downloaded from ImageKit
    [1/25] ✓ Uploaded to R2
    [1/25] ✓ Database updated
    ...
  [SUCCESS] Migrated 25/25 images
  [INFO] Manifest: backups/r2-migration-manifest.jsonl
  ```

- [ ] Verify success rate: 25/25 (100%)

### B. Verify Test URLs

- [ ] Run verification:
  ```powershell
  npm run r2:verify -- --sample 25
  ```

- [ ] Expected output:
  ```
  [INFO] Verifying 25 URLs...
  [PROGRESS] Testing URLs...
    ✓ https://media.sparkstage55.com/products/123/abc.jpg [200 OK]
    ✓ https://media.sparkstage55.com/products/124/def.jpg [200 OK]
    ...
  [SUCCESS] 25/25 URLs accessible (100%)
  ```

### C. Manual Verification

- [ ] Test 3-5 URLs manually dengan browser:
  ```
  https://media.sparkstage55.com/products/<product_id>/<uuid>.jpg
  ```
- [ ] Images harus load tanpa error
- [ ] Check R2 Dashboard: 25 files uploaded

### D. Database Check

- [ ] Check database:
  ```sql
  SELECT image_provider, COUNT(*) 
  FROM product_images 
  GROUP BY image_provider;
  ```

- [ ] Expected (SEBELUM cutover):
  ```
  imagekit | 1598
  ```

- [ ] Note: DB belum cutover, masih pointing ke ImageKit (by design!)

### E. Website Check (IMPORTANT!)

- [ ] Buka https://www.sparkstage55.com
- [ ] Test pages:
  - [ ] Homepage (images load)
  - [ ] Shop page (thumbnails load)
  - [ ] Product detail (images load)
  - [ ] Admin inventory (thumbnails load)

- [ ] DevTools → Network → Filter images
- [ ] Verify masih dari ImageKit: `ik.imagekit.io` (NOT R2 yet!)

**✅ GO/NO-GO Decision Point**:
- [ ] All 25 images migrated successfully
- [ ] All URLs accessible
- [ ] Website masih normal (ImageKit)
- [ ] Ready untuk full migration

---

## ⏸️ CHECKPOINT: Apakah lanjut full migration?

**Jika semua checklist ✅**: Lanjut ke Fase 4 (Full Migration)

**Jika ada masalah**:
- Review error logs
- Fix issues
- Re-run batch test
- Don't proceed until 100% success

---

## ✅ FASE 4: FULL MIGRATION (30-60 menit)

### A. Pre-Flight Final Check

- [ ] Batch test 100% sukses
- [ ] R2 public access verified
- [ ] Custom domain working (jika pakai)
- [ ] Database backup (optional)
- [ ] Window kerja confirmed (off-peak hours recommended)
- [ ] ImageKit subscription masih aktif (untuk rollback)

### B. Run Full Migration

- [ ] Start migration:
  ```powershell
  npm run r2:migrate
  ```

- [ ] Monitor progress (terminal baru):
  ```powershell
  npm run r2:migrate:status
  ```

- [ ] Expected duration: 30-60 menit
- [ ] Monitor output untuk errors

### C. Migration Progress Tracking

**Target**: 1,598 images

Track progress setiap 10 menit:
```
□ 10 min: ~400 images (25%)
□ 20 min: ~800 images (50%)
□ 30 min: ~1200 images (75%)
□ 40 min: ~1598 images (100%)
```

### D. Handle Interruptions

**Jika migration terputus (network, crash, dll)**:

- [ ] Don't panic! Resume otomatis:
  ```powershell
  npm run r2:migrate
  ```

- [ ] Script akan skip images yang sudah uploaded
- [ ] Continue dari checkpoint terakhir

---

## ✅ FASE 5: POST-MIGRATION VERIFICATION (15 menit)

### A. Check Final Status

- [ ] Run status check:
  ```powershell
  npm run r2:migrate:status
  ```

- [ ] Expected output:
  ```
  Total images: 1598
  Migrated to R2: 1598 (100%)
  Still on ImageKit: 0
  Failed: 0
  Success rate: 100%
  ```

### B. Verify All URLs

- [ ] Run full verification (100 random samples):
  ```powershell
  npm run r2:verify
  ```

- [ ] Expected: 100/100 URLs accessible (100%)

**Jika ada failures**:
- [ ] Check failed URLs
- [ ] Re-run migration untuk specific images
- [ ] Don't proceed to cutover until 100%

### C. Cloudflare R2 Dashboard Check

- [ ] Login Cloudflare → R2 → Bucket
- [ ] Navigate folder: `products/`
- [ ] Verify object count: **~1,598 files**
- [ ] Spot check 5-10 files (preview available)

### D. Backup Verification

- [ ] Verify manifest file exists:
  ```powershell
  dir backups\r2-migration-manifest.jsonl
  ```

- [ ] File should contain 1,598 records
- [ ] Keep this file PERMANENT (rollback reference)

---

## ⚠️ FASE 6: DATABASE CUTOVER (5 menit) - CRITICAL!

**⚠️ WARNING**: Ini adalah point of no return sampai rollback dijalankan!

### A. Pre-Cutover Checklist (ALL MUST BE ✅)

- [ ] 1,598/1,598 images uploaded to R2 (100%)
- [ ] 100% URLs verified accessible
- [ ] R2 bucket object count matches (1,598)
- [ ] ImageKit subscription masih aktif (untuk rollback)
- [ ] Off-peak hours window
- [ ] Team ready untuk monitor 15-30 menit

### B. Dry Run Cutover (WAJIB!)

- [ ] Run dry run:
  ```powershell
  npm run r2:cutover:dry
  ```

- [ ] Expected output:
  ```
  [DRY RUN] Would update 1598 rows:
    UPDATE product_images SET
      image_url = (R2 URL),
      image_provider = 'r2',
      provider_original_url = (ImageKit URL),
      migrated_at = NOW()
    WHERE image_provider = 'imagekit'
  [DRY RUN] No changes made.
  ```

- [ ] Review output, pastikan make sense

### C. Production Cutover

- [ ] **DEEP BREATH** 🧘‍♂️
- [ ] Run production cutover:
  ```powershell
  npm run r2:cutover:confirm
  ```

- [ ] Script akan confirm 3x:
  ```
  ⚠️  WARNING: This will update 1598 rows!
  ⚠️  All product images will switch to R2.
  ⚠️  Type 'CONFIRM CUTOVER' to proceed: _
  ```

- [ ] Type: `CONFIRM CUTOVER` (exact text!)
- [ ] Press Enter

- [ ] Expected output:
  ```
  [INFO] Starting production cutover...
  [INFO] Backup ImageKit URLs... ✓
  [INFO] Updating 1598 rows...
  [SUCCESS] Cutover completed!
  [INFO] Updated 1598 rows in 2.3 seconds
  ```

### D. IMMEDIATE Post-Cutover Checks (DALAM 5 MENIT!)

**🚨 CRITICAL - Lakukan segera!**

#### 1. Database Verification
```sql
SELECT image_provider, COUNT(*) 
FROM product_images 
GROUP BY image_provider;

-- Expected:
-- r2 | 1598
```

#### 2. Website Check (MOST IMPORTANT!)
- [ ] **Clear browser cache** atau gunakan Incognito
- [ ] Buka https://www.sparkstage55.com
- [ ] **Homepage**: Check images load ✅
- [ ] **Shop page**: Check product thumbnails ✅
- [ ] **Product detail**: Check multiple products ✅
- [ ] **Admin inventory**: Check thumbnails ✅

#### 3. DevTools Network Check
- [ ] Open DevTools → Network tab
- [ ] Filter: Images
- [ ] **Verify**: URLs dari `media.sparkstage55.com` (NOT `ik.imagekit.io`!)
- [ ] **Check**: No 404 errors, no broken images

#### 4. Broken Image Count
- [ ] Scroll homepage: Count broken images (gray boxes)
- [ ] **Acceptable**: 0-2 images (investigate specific items)
- [ ] **ROLLBACK**: > 5 images (something wrong!)

---

## 🚨 ROLLBACK PROCEDURE (Jika Diperlukan)

**Trigger Rollback if**:
- [ ] > 5 broken images detected
- [ ] Homepage tidak load images
- [ ] Critical errors di console

**Rollback Steps** (5 menit):

```sql
-- Rollback ke ImageKit URLs
BEGIN;

UPDATE product_images
SET 
  image_url = provider_original_url,
  image_provider = 'imagekit',
  provider_file_id = NULL,
  migrated_at = NULL
WHERE image_provider = 'r2' 
  AND provider_original_url IS NOT NULL;

-- Verify
SELECT image_provider, COUNT(*) 
FROM product_images 
GROUP BY image_provider;
-- Expected: imagekit | 1598

COMMIT;
```

- [ ] Test website immediately
- [ ] Images harus kembali dari ImageKit
- [ ] Investigate issue sebelum retry

---

## ✅ FASE 7: SOAK PERIOD (14-30 hari)

### Week 1 Monitoring (INTENSIVE)

**Daily checks**:
- [ ] **Day 1**: Website spot check (10 random products)
- [ ] **Day 2**: Run `npm run r2:verify -- --sample 20`
- [ ] **Day 3**: Website spot check
- [ ] **Day 4**: Cloudflare analytics review
- [ ] **Day 5**: ImageKit bandwidth check (should drop)
- [ ] **Day 6**: Website spot check
- [ ] **Day 7**: Full week review

**Metrics to track**:
```
Broken images: Target = 0
R2 bandwidth cost: Target = $0
ImageKit bandwidth: Target < 5 GB/week
Customer complaints: Target = 0
```

### Week 2-4 Monitoring (WEEKLY)

**Weekly checks**:
- [ ] **Monday**: Spot check 10 random products
- [ ] **Friday**: Run verification script
- [ ] **End of week**: Review metrics

**Target by Week 4**:
- [ ] Zero broken images (30 hari stable)
- [ ] ImageKit bandwidth < 1 GB/month
- [ ] R2 cost ~$0.06/month
- [ ] No customer complaints
- [ ] Cache hit ratio > 95%

---

## ✅ FASE 8: CLEANUP (After 30+ days stable)

### Step 1: Downgrade ImageKit

- [ ] 30 hari soak period completed ✅
- [ ] Zero issues during soak ✅
- [ ] Login ImageKit Dashboard
- [ ] Settings → Billing
- [ ] **Downgrade to Free Plan**
- [ ] Konfirm downgrade

### Step 2: Monitor Free Plan (7 days)

- [ ] Track bandwidth: Should be < 1 GB/week
- [ ] If stable: Proceed to cancel
- [ ] If high usage: Investigate (something wrong!)

### Step 3: Cancel ImageKit Subscription

- [ ] 7 hari on Free Plan stable
- [ ] ImageKit Dashboard → Settings → Billing
- [ ] **Cancel Subscription**
- [ ] Reason: "Migrated to alternative CDN"
- [ ] Confirm cancellation
- [ ] **Save confirmation email**

### Step 4: Celebrate! 🎉

**🎉 SUCCESS!**
- ✅ Saved $9/month = $108/year
- ✅ Zero egress cost forever
- ✅ Unlimited bandwidth
- ✅ Faster delivery (Cloudflare CDN)

---

## 📊 Final Success Criteria

- [x] Setup R2 bucket dengan public access
- [ ] 1,598/1,598 images migrated to R2
- [ ] Database cutover completed
- [ ] 30 hari stable (zero critical issues)
- [ ] ImageKit cancelled
- [ ] **Saving $9/month confirmed** 💰

---

## 📞 Emergency Contacts & Resources

- **Documentation**: `docs/runbooks/r2-migration.md`
- **Egress Setup**: `docs/runbooks/R2_EGRESS_SETUP.md`
- **Quick Start**: `docs/runbooks/R2_MIGRATION_QUICKSTART.md`
- **Manifest Backup**: `backups/r2-migration-manifest.jsonl`
- **Rollback SQL**: See section above

---

**Ready to Start?** Begin with **FASE 0: PERSIAPAN**

**Questions?** Review full documentation atau ask Kiro! 🤖
