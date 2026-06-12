# ✅ R2 Migration - Ready for Database Cutover

**Date**: June 9, 2026  
**Status**: 🟢 **READY FOR CUTOVER**

---

## 📊 Migration Summary

### ✅ Phase 1: Upload to R2 (COMPLETE)
- **Product images uploaded**: 2,227 / 2,227 (100%)
- **R2 bucket**: `sparkstage-public-assets`
- **R2 folder**: `/products/`
- **Custom domain**: `cdn.sparkstage55.com` ✅ ACTIVE
- **SSL certificate**: ✅ ACTIVE

### ⏭️ Phase 2: Public Assets (/public/ folder)
- **Decision**: **SKIP** - Not needed!
- **Reason**: Database has 0 references to `/public/` folder
- **Status**: ✅ VERIFIED - Tables empty:
  - `banners`: 0 records
  - `beauty_posters`: 0 records
  - `glam_page_settings`: 0 records
  - `dressing_room_look_photos`: 0 records

**Conclusion**: ImageKit `/public/` folder contains **legacy/unused files** that are not referenced by the application. Safe to skip.

### 🎯 Phase 3: Database Cutover (READY TO EXECUTE)
- **Script created**: `scripts/cutover-products-to-r2.sql`
- **Rollback script**: `scripts/rollback-to-imagekit.sql`
- **Table to update**: `product_images` only
- **Records to update**: ~2,227 records
- **Estimated time**: < 1 minute

---

## 🗂️ Files Created

### Migration Scripts
- ✅ `scripts/migrate-imagekit-to-r2.mjs` - Initial product migration
- ✅ `scripts/retry-failed-r2-migrations.mjs` - Retry failed uploads
- ✅ `scripts/r2-migration-status.mjs` - Check migration status
- ✅ `scripts/migrate-imagekit-public-to-r2.mjs` - Public folder migration (not needed)
- ✅ `scripts/check-public-asset-providers.mjs` - Verify public asset usage

### Database Scripts
- ✅ `scripts/cutover-products-to-r2.sql` - **CUTOVER SCRIPT** ⭐
- ✅ `scripts/rollback-to-imagekit.sql` - **ROLLBACK SCRIPT** 🔄

### Verification Scripts
- ✅ `scripts/verify-r2-urls.mjs` - Test R2 URL accessibility
- ✅ `scripts/test-custom-domain.mjs` - Test custom domain
- ✅ `scripts/check-banner-images.mjs` - Check banner usage
- ✅ `scripts/check-database-imagekit-count.sql` - Count ImageKit URLs

### Documentation
- ✅ `docs/runbooks/r2-migration.md` - Full migration guide
- ✅ `docs/runbooks/R2_EGRESS_SETUP.md` - Egress setup guide
- ✅ `docs/runbooks/R2_MIGRATION_QUICKSTART.md` - Quick start
- ✅ `R2_MIGRATION_DIAGNOSIS.md` - Failed upload diagnosis
- ✅ `R2_CUTOVER_CHECKLIST.md` - Cutover checklist
- ✅ `PUBLIC_FOLDER_MIGRATION_SCOPE.md` - Public folder analysis
- ✅ `R2_MIGRATION_COMPLETE.md` - This file

### Migration Data
- ✅ `backups/r2-migration-manifest.jsonl` - Original migration log (2,227 success)
- ✅ `backups/r2-migration-manifest-retry.jsonl` - After retry (5,030 total attempts, 2,227 unique)
- ✅ `backups/r2-migration-summary.json` - Summary statistics

### Configuration
- ✅ `.env.r2-migration` - R2 credentials and custom domain config

---

## 🔍 Pre-Cutover Verification

### 1. R2 Bucket Status
```
Bucket name: sparkstage-public-assets
Region: APAC
Objects: 2,227 product images
Total size: ~165 MB
Public access: ✅ ENABLED (via custom domain)
```

### 2. Custom Domain Status
```
Domain: cdn.sparkstage55.com
CNAME: sparkstage-public-assets.r2.cloudflarestorage.com
SSL: ✅ ACTIVE (Cloudflare managed)
DNS: ✅ PROPAGATED
Test URL: ✅ WORKING
```

Test command:
```bash
curl -I https://cdn.sparkstage55.com/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
# Expected: HTTP/2 200
```

### 3. Database Status
```
Table: product_images
Total records: ~2,227
ImageKit URLs: ~2,227 (100%)
R2 URLs: 0 (0%)
Status: ⏸️ READY FOR CUTOVER
```

---

## 🚀 Cutover Execution Plan

### Step 1: Backup Database ⚠️ CRITICAL

Before cutover, **BACKUP** the `product_images` table:

```bash
# Option A: Use Supabase Dashboard
# Go to: Database > Backups > Create Backup

# Option B: Export table to CSV
node scripts/backup-product-images.mjs
```

### Step 2: Run Cutover Script

**Method A**: Via `psql` (if installed)
```bash
psql -h aws-0-ap-southeast-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.hogzjapnkvsihvvbgcdb \
     -d postgres \
     -f scripts/cutover-products-to-r2.sql
```

**Method B**: Via Supabase Dashboard (RECOMMENDED)
1. Go to: https://supabase.com/dashboard/project/hogzjapnkvsihvvbgcdb/editor
2. Click: **SQL Editor** > **New Query**
3. Copy-paste: `scripts/cutover-products-to-r2.sql`
4. Click: **Run**
5. Review verification output
6. If OK: Change `-- COMMIT;` → `COMMIT;` and run again
7. If ERROR: Change `-- ROLLBACK;` → `ROLLBACK;` and run again

### Step 3: Verify Website

**Immediately after cutover**, test these pages:

1. **Homepage**: https://www.sparkstage55.com/
2. **Product page**: https://www.sparkstage55.com/products/[any-product-id]
3. **Admin products**: https://www.sparkstage55.com/admin/products

**Check**:
- [ ] Product images load correctly
- [ ] No broken images
- [ ] Image quality OK
- [ ] Mobile website works

### Step 4: Monitor for 1 Hour

After cutover, monitor for:
- Broken image reports from users
- Performance issues
- Error logs in Supabase

### Step 5: Full Website Audit (Within 24 Hours)

- [ ] Test 20 random product pages
- [ ] Check all product categories
- [ ] Test on desktop and mobile
- [ ] Check admin product pages
- [ ] Verify image loading speed

---

## 🔄 Rollback Plan

If anything goes wrong:

### Quick Rollback (< 1 minute)

**Via Supabase Dashboard**:
1. Go to: SQL Editor
2. Copy-paste: `scripts/rollback-to-imagekit.sql`
3. Click: **Run**
4. Review output
5. Change `-- COMMIT;` → `COMMIT;` and run again

**Result**: All URLs restored to ImageKit immediately

### Verify Rollback

```bash
# Check that ImageKit URLs are restored
node scripts/check-database-imagekit-count.sql
# Expected: ~2,227 ImageKit URLs
```

---

## 📈 Expected Benefits

### Cost Savings
- **ImageKit**: ~$10/month (bandwidth + storage)
- **Cloudflare R2**: ~$0.30/month (storage only, **$0 bandwidth**)
- **Savings**: ~$115/year 🎉

### Performance
- **Cloudflare CDN**: Global edge network
- **Custom domain**: Zero egress cost
- **SSL/TLS**: Included free

### Simplicity
- Single CDN (Cloudflare)
- Integrated with website domain
- Easy to manage

---

## ⚠️ Important Notes

1. **No downtime expected** - Cutover is instant (< 1 second)
2. **Images remain in ImageKit** - Safe to keep for 7 days as backup
3. **Rollback available** - Can revert anytime within 7 days
4. **Custom domain active** - Zero egress cost confirmed
5. **Public folder skipped** - Not needed (0 database references)

---

## 📋 Cutover Checklist

### Pre-Cutover
- [x] All 2,227 images uploaded to R2
- [x] Custom domain configured (cdn.sparkstage55.com)
- [x] SSL certificate active
- [x] Test URLs verified (200 OK)
- [x] Public folder analyzed (not needed)
- [x] Cutover script created
- [x] Rollback script created
- [ ] Database backup created ⚠️ **DO THIS NOW**

### During Cutover
- [ ] Run cutover script via Supabase Dashboard
- [ ] Review verification output
- [ ] Confirm COMMIT
- [ ] Test homepage immediately
- [ ] Test 3 product pages

### Post-Cutover
- [ ] Monitor for 1 hour
- [ ] Full website audit (20 pages)
- [ ] Check error logs
- [ ] Verify mobile website
- [ ] Update AGENTS.md with new status

### After 7 Days (If Stable)
- [ ] Delete ImageKit images (optional - save costs)
- [ ] Remove ImageKit account (optional)
- [ ] Update documentation with final status

---

## 🎯 Ready to Execute?

**Everything is ready!** You just need to:

1. ✅ **Backup database** (Supabase Dashboard > Database > Backups)
2. ✅ **Run cutover script** (Supabase Dashboard > SQL Editor)
3. ✅ **Test website** (3-5 minutes)
4. ✅ **Monitor** (1 hour)

**Estimated total time**: 15-30 minutes

---

## 🆘 Need Help?

If you encounter issues:

1. **Images not loading**: Run rollback script immediately
2. **Slow loading**: Check Cloudflare DNS propagation
3. **404 errors**: Verify custom domain SSL certificate
4. **Mixed content**: Ensure R2 URLs use `https://`

**Emergency contacts**:
- Cloudflare Support: https://dash.cloudflare.com/support
- Supabase Support: https://supabase.com/dashboard/support

---

## 📝 Final Summary

| Item | Status |
|------|--------|
| Product images in R2 | ✅ 2,227 / 2,227 (100%) |
| Custom domain active | ✅ cdn.sparkstage55.com |
| SSL certificate | ✅ ACTIVE |
| Public folder needed | ❌ NO (0 database refs) |
| Database backup | ⏸️ **TODO** |
| Cutover script ready | ✅ YES |
| Rollback script ready | ✅ YES |
| Test URLs working | ✅ YES |
| **READY FOR CUTOVER** | 🟢 **YES** |

---

**Next Action**: Create database backup, then run `scripts/cutover-products-to-r2.sql` 🚀
