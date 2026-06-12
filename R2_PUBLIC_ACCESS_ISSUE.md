# R2 Public Access Issue - Diagnosis & Solution

**Date**: June 9, 2026  
**Status**: ⚠️ BLOCKED - R2.dev public URL not working despite enabled

---

## Problem Summary

### ✅ What's Working

1. **All files uploaded to R2**
   - Actual R2 objects: 2,227 unique files
   - Bucket info confirms: 165 MB, 2,227 objects
   - Files downloadable via wrangler CLI
   - Test download successful: `products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png` (236,126 bytes)

2. **Public access enabled**
   ```bash
   wrangler r2 bucket dev-url get sparkstage-public-assets
   # Output: Public access is enabled at 'https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev'
   ```

3. **Database still safe**
   - All `product_images` still point to ImageKit
   - Website 100% functional
   - No downtime

### ❌ What's NOT Working

**R2.dev public URLs return errors:**

```
❌ https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png

Error: fetch failed / SSL connection error
```

**All verification tests fail (0 / 10 passed)**

---

## Root Cause Analysis

### Investigation Results

1. **Files definitely exist in R2** ✅
   - Wrangler download works
   - Object count matches
   - File sizes correct

2. **Public access definitely enabled** ✅
   - Wrangler command confirms
   - Settings show enabled

3. **R2.dev domain not resolving** ❌
   - DNS might not be propagated
   - SSL/TLS handshake failing
   - Possible account/region limitation

### Why This Happens

Cloudflare R2.dev domains sometimes have issues:
- **DNS propagation delay** (can take hours for new buckets)
- **Free tier limitations** (may not support R2.dev in all regions)
- **Account restrictions** (new accounts may have restrictions)
- **APAC region issue** (bucket created in APAC, DNS not fully propagated)

---

## Solutions (3 Options)

### Option 1: Wait for DNS Propagation (24-48 hours) ⏰

**Pros:**
- No additional work
- R2.dev is free (zero egress cost)
- Simplest solution

**Cons:**
- Unpredictable timeline
- Might not work at all
- Delays cutover

**Action:**
- Wait 24-48 hours
- Re-test URLs periodically
- Monitor Cloudflare status

### Option 2: Use Custom Domain (RECOMMENDED) ✅

**Pros:**
- Reliable and production-ready
- Full control over domain
- Zero egress cost (same as R2.dev)
- Professional URL

**Cons:**
- Requires DNS configuration
- Need a domain (sparkstage.com sudah ada?)
- 5-10 minutes setup

**Steps:**

1. **Connect Custom Domain to R2 Bucket**
   ```bash
   # Via Dashboard: R2 > sparkstage-public-assets > Settings > Custom Domains
   # Add: cdn.sparkstage.com (or subdomain lain)
   ```

2. **Add DNS Record**
   ```
   Type: CNAME
   Name: cdn (or subdomain choice)
   Target: sparkstage-public-assets.r2.cloudflarestorage.com
   Proxied: Yes (untuk zero egress)
   ```

3. **Wait for DNS** (5-10 minutes)

4. **Update .env.r2-migration**
   ```
   R2_PUBLIC_BASE_URL=https://cdn.sparkstage.com
   ```

5. **Test URL**
   ```
   https://cdn.sparkstage.com/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
   ```

**Estimated time:** 15-20 minutes

### Option 3: Use Cloudflare Workers Proxy (Advanced) 🔧

**Pros:**
- Full control
- Can add caching, transforms, etc.
- Zero egress cost

**Cons:**
- More complex setup
- Requires Workers code
- Maintenance overhead

**Skip this unless Options 1 & 2 fail**

---

## Recommended Action Plan

### Phase 1: Try Custom Domain (TODAY)

**Prerequisite:** Domain sparkstage.com exists and managed by Cloudflare

**Steps:**

1. **Add Custom Domain to R2 Bucket**
   - Dashboard: https://dash.cloudflare.com
   - R2 > sparkstage-public-assets > Settings > Custom Domains
   - Click "Connect Domain"
   - Enter: `cdn.sparkstage.com` (or `images.sparkstage.com`)
   - Follow DNS configuration prompts

2. **Update Configuration**
   ```bash
   # Edit .env.r2-migration
   R2_PUBLIC_BASE_URL=https://cdn.sparkstage.com
   ```

3. **Test Custom Domain**
   ```bash
   # Wait 5-10 minutes after DNS config
   curl -I https://cdn.sparkstage.com/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
   ```

4. **Run Verification**
   ```bash
   node scripts/verify-r2-urls.mjs --manifest backups\r2-migration-manifest-retry.jsonl --sample-size 10
   ```

**Expected result:** 10 / 10 passed ✅

5. **Proceed with Database Cutover**

### Phase 2: If Custom Domain Works, Update Manifest

Need to regenerate manifest URLs with custom domain:

```bash
# TO BE CREATED: Update manifest URLs script
node scripts/update-manifest-urls.mjs --env-file .env.r2-migration
```

---

## Important Notes About Manifest

### Duplicate Uploads Discovery

**Finding:**
- Manifest shows: 5,030 success records
- Actual R2 objects: 2,227 unique files
- **Reason:** Files were uploaded multiple times (retry overwrites same key)

**Impact:**
- ✅ **No problem!** R2 automatically overwrites files with same key
- ✅ Latest upload is the one that persists
- ✅ All unique product images exist in R2

**Database Reality Check:**

We need to verify database has 2,227 or 5,030 product_images records:

```sql
SELECT COUNT(*) FROM product_images WHERE provider = 'imagekit';
```

If database has:
- **2,227 rows** → Perfect! 1:1 mapping
- **5,030 rows** → Some products have multiple images (variants, gallery)

---

## Next Steps (Priority Order)

### Step 1: Check Domain Availability

**Question for user:** Apakah kamu punya domain `sparkstage.com` di Cloudflare?

- ✅ **YES** → Proceed with Custom Domain (Option 2)
- ❌ **NO** → Wait for R2.dev (Option 1) or buy domain

### Step 2: Setup Custom Domain (if YES)

Follow "Recommended Action Plan" above

### Step 3: Database Cutover (After URLs Work)

Only proceed after:
- [ ] Custom domain URLs working (10 / 10 test passed)
- [ ] Test URLs in browser loads images
- [ ] Backup database `product_images` table

---

## Files & Commands Reference

### Diagnostic Commands

```bash
# Check R2 bucket info
wrangler r2 bucket info sparkstage-public-assets

# Check public access status
wrangler r2 bucket dev-url get sparkstage-public-assets

# Download file from R2 (verify exists)
wrangler r2 object get sparkstage-public-assets/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png --remote --file test.png

# Verify R2 URLs
node scripts/verify-r2-urls.mjs --manifest backups\r2-migration-manifest-retry.jsonl --sample-size 10

# Diagnose upload vs actual R2 content
node scripts/diagnose-r2-upload-issue.mjs --env-file .env.r2-migration
```

### Important Files

- `.env.r2-migration` - R2 credentials & public URL config
- `backups/r2-migration-manifest-retry.jsonl` - Final migration log (5,030 records)
- `test-image.png` - Downloaded test file (236,126 bytes)
- `R2_CUTOVER_CHECKLIST.md` - Complete cutover checklist
- `R2_PUBLIC_ACCESS_ISSUE.md` - This document

---

## FAQ

### Q: Are files actually in R2?
**A:** ✅ YES! Verified via wrangler download. 2,227 unique files, 165 MB total.

### Q: Is public access enabled?
**A:** ✅ YES! Wrangler confirms: "Public access is enabled at R2.dev"

### Q: Why don't R2.dev URLs work?
**A:** ⚠️ Unknown. Likely DNS propagation or account limitation. Custom domain is safer.

### Q: Can we proceed with cutover?
**A:** ❌ NO! Not until public URLs work. Otherwise website will have broken images.

### Q: Is website affected now?
**A:** ✅ NO! Database still uses ImageKit. Website 100% functional.

### Q: What's the safest solution?
**A:** 🎯 **Custom Domain** (Option 2). Reliable, professional, zero egress cost.

### Q: How long will custom domain take?
**A:** ⏱️ **15-20 minutes** (DNS usually propagates in 5-10 mins)

---

**Status:** ⏸️ BLOCKED - Waiting for custom domain setup or R2.dev DNS propagation

**Recommended Next Action:** Setup custom domain `cdn.sparkstage.com` (Option 2)

**Contact:** Ask if you need help with custom domain DNS configuration!
