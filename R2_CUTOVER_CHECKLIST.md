# R2 Migration - Database Cutover Checklist ✅

**Date**: June 9, 2026  
**Migration Status**: ✅ **100% UPLOADED** (5,030 / 5,030 images)  
**Cutover Status**: ⏸️ **WAITING** - R2 public access needs verification

---

## ✅ Phase 1: Upload to R2 (COMPLETE)

- [x] Obtain correct R2 credentials (32-char access key)
- [x] Create R2 bucket `sparkstage-public-assets`
- [x] Upload all ImageKit images to R2
  - [x] Initial batch: 2,227 images succeeded
  - [x] Retry failed batch: 2,803 images succeeded
  - [x] **Total: 5,030 / 5,030 (100%)**
- [x] All files in `/products/` folder (no `/public/` folder needed)

---

## ⚠️ Phase 2: Enable R2 Public Access (IN PROGRESS)

### Current Issue

**Problem**: Files uploaded to R2 but **not accessible via public URL**

Test URL gagal:
```
❌ https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/27/da731983-d78c-4a7f-8421-1b68ea149bee.png
```

**Error**: `fetch failed` / SSL error

### Solution: Enable R2 Public Access

#### Step-by-Step (via Cloudflare Dashboard):

1. **Go to Cloudflare Dashboard**
   - URL: https://dash.cloudflare.com
   - Login with your account

2. **Navigate to R2**
   - Sidebar: Click **R2**
   - Click bucket: **sparkstage-public-assets**

3. **Settings Tab**
   - Click **Settings** tab at the top
   - Scroll to **Public Access** section

4. **Enable Public Access**
   - Look for: **"Public Access"** or **"R2.dev subdomain"**
   - Current status likely: ❌ **Disabled** or ⚠️ **Not configured**
   - Click: **"Enable Public Access"** or **"Allow Access"**
   - Confirm the R2.dev domain: `pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev`

5. **Save Settings**
   - Click **Save** or **Apply**

#### Alternative: Check Custom Domain

Jika R2.dev domain tidak bisa diaktifkan, bisa pakai **Custom Domain**:

1. Di bucket settings, cari **Custom Domains**
2. Click **Connect Domain**
3. Enter domain: `cdn.sparkstage.com` atau subdomain lain
4. Follow DNS configuration steps
5. Wait for DNS propagation (5-10 minutes)

### Verification After Enable

Test 1: **Browser Test**
```
Buka di browser:
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/27/da731983-d78c-4a7f-8421-1b68ea149bee.png
```

Expected result: **Image loads**

Test 2: **Script Verification**
```bash
node scripts/verify-r2-urls.mjs --manifest backups\r2-migration-manifest-retry.jsonl --sample-size 10
```

Expected result: **10 / 10 passed (100%)**

---

## ⏸️ Phase 3: Database Cutover (WAITING FOR PUBLIC ACCESS)

**⚠️ DO NOT RUN CUTOVER UNTIL PUBLIC ACCESS IS WORKING!**

### Pre-Cutover Checklist

- [ ] R2 public access enabled and verified
- [ ] Test URLs working (10 / 10 passed)
- [ ] Backup database `product_images` table
- [ ] Prepare rollback script (if needed)

### Cutover Script (TO BE CREATED)

Will update all `product_images` table:
```sql
-- FROM (ImageKit):
image_url = 'https://ik.imagekit.io/hjnuyz1t3/products/...'
provider = 'imagekit'

-- TO (R2):
image_url = 'https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/...'
provider = 'r2'
```

### Post-Cutover Verification

- [ ] Test website homepage loads
- [ ] Check 10 random product pages
- [ ] Verify admin product images load
- [ ] Check mobile website
- [ ] Monitor for broken image reports

---

## 🔄 Rollback Plan

If anything goes wrong after cutover:

### Quick Rollback (restore ImageKit URLs):
```sql
UPDATE product_images
SET 
  image_url = old_image_url,  -- Assuming we backed up old URLs
  provider = 'imagekit'
WHERE provider = 'r2';
```

### Full Rollback Steps:
1. Stop cutover script immediately
2. Run rollback SQL
3. Verify website shows ImageKit images again
4. Keep R2 files (don't delete)
5. Investigate what went wrong
6. Fix issue and retry cutover

---

## 📋 Current Status Summary

### ✅ Completed
- All 5,030 images uploaded to R2
- Retry successful (0 failures)
- Migration manifest saved
- R2 credentials configured correctly

### ⏳ In Progress
- **Enable R2 public access** (CURRENT BLOCKER)
- Verify URLs are publicly accessible

### ⏸️ Pending (After Public Access Works)
- Create database cutover script
- Backup database
- Run cutover
- Verify website
- Monitor for issues

---

## 🎯 Next Actions (PRIORITAS 1)

### Action 1: Enable R2 Public Access

**Where**: Cloudflare Dashboard > R2 > sparkstage-public-assets > Settings

**What to do**:
1. Enable "Public Access" or "R2.dev subdomain"
2. Confirm domain: `pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev`
3. Save settings

**Expected time**: 2-5 minutes

### Action 2: Verify Public Access

**Test in browser**:
```
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/27/da731983-d78c-4a7f-8421-1b68ea149bee.png
```

**Test with script**:
```bash
node scripts/verify-r2-urls.mjs --manifest backups\r2-migration-manifest-retry.jsonl --sample-size 10
```

**Expected result**: 10 / 10 passed

### Action 3: Create Cutover Script (After Verification)

Will need to create:
- `scripts/cutover-to-r2.mjs` - Update database URLs
- `scripts/rollback-to-imagekit.mjs` - Restore ImageKit URLs

---

## 💾 Important Files

### Migration Data
- `backups/r2-migration-manifest.jsonl` - Original migration (2,227 success)
- `backups/r2-migration-manifest-retry.jsonl` - After retry (5,030 success) ⭐ **USE THIS**
- `backups/r2-migration-summary.json` - Summary stats

### Scripts
- `scripts/retry-failed-r2-migrations.mjs` - Retry failed uploads ✅ DONE
- `scripts/r2-migration-status.mjs` - Check migration status
- `scripts/verify-r2-urls.mjs` - Test URL accessibility
- `scripts/cutover-to-r2.mjs` - Database cutover ⏸️ TO BE CREATED

### Configuration
- `.env.r2-migration` - R2 credentials
- `R2_CUTOVER_CHECKLIST.md` - This checklist
- `R2_MIGRATION_DIAGNOSIS.md` - Problem diagnosis
- `R2_MIGRATION_NEXT_STEPS.md` - Next steps guide

---

## ⚠️ Important Notes

1. **Website is still 100% functional** - Database still uses ImageKit URLs
2. **No downtime yet** - Migration is invisible to users
3. **R2 files exist** - All 5,030 images uploaded successfully
4. **Public access is the blocker** - Files uploaded but not accessible
5. **DO NOT RUN CUTOVER** until public access works!

---

## 📞 Need Help?

If stuck on enabling public access:

1. **Screenshot Cloudflare R2 bucket settings**
   - Share screenshot of "Public Access" section
   
2. **Check Cloudflare docs**:
   - https://developers.cloudflare.com/r2/buckets/public-buckets/

3. **Alternative**: Use Custom Domain instead of R2.dev
   - Requires DNS configuration
   - Takes 5-10 minutes for propagation

---

**Status**: ⏸️ PAUSED - Waiting for R2 public access to be enabled

**Next Step**: Enable public access di Cloudflare Dashboard → R2 → sparkstage-public-assets → Settings

**Contact**: Ask for help if you need assistance enabling public access!
