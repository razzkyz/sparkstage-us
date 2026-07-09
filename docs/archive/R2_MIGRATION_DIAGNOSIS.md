# R2 Migration Diagnosis - Failed Uploads Analysis

**Date**: June 9, 2026  
**Status**: ⚠️ INCOMPLETE - 55.7% failure rate (2,803 failed / 5,030 total)

## Problem Summary

Migration from ImageKit to Cloudflare R2 resulted in **2,803 failed uploads** out of 5,030 total images:
- ✓ **2,227 succeeded** (44.3%)
- ✗ **2,803 failed** (55.7%)

## Root Cause

**All failed uploads used the WRONG credential type**: Cloudflare API Token (53 characters) instead of R2 Access Key (32 characters).

### Error Pattern

Every failed migration shows the same error:
```json
{
  "status": "failed",
  "error": "R2 upload failed (400): Credential access key has length 53, should be 32"
}
```

### Timeline

1. **First 2,803 attempts**: Used Cloudflare API Token (`cfat_...`, 53 characters) → ✗ ALL FAILED
2. **Credential correction**: User provided correct R2 Access Keys (32 characters)
3. **Remaining 2,227 attempts**: Used correct R2 Access Keys → ✓ ALL SUCCEEDED

## What Happened

The migration script attempted to upload images in this sequence:

### Phase 1: Failed Batch (2,803 images)
- Credential used: **Cloudflare API Token** (wrong type)
- Access Key length: **53 characters** (should be 32)
- Result: **100% failure rate**
- Files affected: All images in first batch

### Phase 2: Successful Batch (2,227 images)
- Credential used: **R2 Access Keys** (correct type)
- Access Key length: **32 characters** ✓
- Result: **100% success rate**
- Files uploaded to: `sparkstage-public-assets/products/`

## Current State

### R2 Bucket Contents
```
sparkstage-public-assets/
└── products/          ← Only 2,227 images uploaded (44.3%)
    ├── 32/
    ├── 34/
    ├── 38/
    └── ...
```

### Database State
- All `product_images` table entries **still point to ImageKit URLs**
- No database cutover has been performed
- Website is still serving images from ImageKit ✓ (no downtime)

### ImageKit Contents
```
ImageKit root/
├── public/            ← User noticed this folder exists
└── products/          ← This folder was partially migrated
```

## Solution: Retry Failed Migrations

### Step 1: Verify Current Credentials

Check `.env.r2-migration` has correct R2 Access Keys:

```bash
# CORRECT credentials (32 characters for access key):
R2_ACCOUNT_ID=58103a6169fd3011a58d558c15adb7c6
R2_ACCESS_KEY_ID=2e5f3b814dfd2925e60bb5aad6f74483  # ← 32 chars ✓
R2_SECRET_ACCESS_KEY=fdb41bebbc3ae3f763bd9abb3bd1238402d6adf7e19422d08498ed9754e35f5c
R2_BUCKET_NAME=sparkstage-public-assets
R2_PUBLIC_BASE_URL=https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev
```

### Step 2: Run Retry Script

```bash
# Dry run first (preview what will be retried)
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration --dry-run

# Execute retry (re-upload all 2,803 failed images)
node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration
```

### Step 3: Verify 100% Success

```bash
# Check final migration status
node scripts/r2-migration-status.mjs --env-file .env.r2-migration
```

Expected output:
```
Total images: 5,030
✓ Succeeded: 5,030 (100%)
✗ Failed: 0 (0%)
```

## About ImageKit `public/` Folder

**Question**: ImageKit has both `/public/` and `/products/` folders, but R2 only has `/products/`. Is this a problem?

**Investigation needed**:
1. Check what files exist in ImageKit `/public/` folder
2. Determine if these files are referenced in the database
3. Confirm if these are product images or other assets (banners, logos, etc.)

### Query to Check `/public/` References

```sql
-- Check if any product_images reference /public/ folder
SELECT 
  id,
  product_id,
  image_url,
  provider,
  provider_file_path
FROM product_images
WHERE 
  provider = 'imagekit'
  AND (
    image_url LIKE '%/public/%'
    OR provider_file_path LIKE '/public/%'
  )
LIMIT 10;
```

### Possible Scenarios

1. **`/public/` contains product images**: Need to migrate these too
2. **`/public/` contains other assets**: May need separate migration strategy
3. **`/public/` is unused/legacy**: Can ignore for this migration

## Migration Checklist

### Pre-Cutover Requirements
- [ ] Retry failed migrations with correct credentials
- [ ] Verify 100% success rate (5,030 / 5,030)
- [ ] Investigate ImageKit `/public/` folder contents
- [ ] Decide on `/public/` folder migration strategy
- [ ] Test sample R2 URLs are publicly accessible
- [ ] Backup database before cutover

### Cutover Execution
- [ ] Run database cutover script
- [ ] Update all `product_images` URLs from ImageKit to R2
- [ ] Test website immediately after cutover
- [ ] Verify all product images load correctly
- [ ] Check admin product pages

### Post-Cutover Validation
- [ ] Full website image audit
- [ ] Performance comparison (ImageKit vs R2)
- [ ] Monitor for broken image reports
- [ ] Keep ImageKit active for 7 days as fallback
- [ ] Delete ImageKit images after verification period

## Files to Review

- **Migration manifest**: `backups/r2-migration-manifest.jsonl` (current state)
- **Retry manifest**: `backups/r2-migration-manifest-retry.jsonl` (after retry)
- **Retry script**: `scripts/retry-failed-r2-migrations.mjs`
- **Status checker**: `scripts/r2-migration-status.mjs`
- **Credentials**: `.env.r2-migration`

## Key Learnings

1. **Cloudflare has TWO types of credentials**:
   - ❌ **Cloudflare API Token** (`cfat_...`, 53 chars) - for Cloudflare Dashboard API
   - ✓ **R2 Access Keys** (32 chars) - for S3-compatible storage access

2. **Always validate credential format** before bulk operations
3. **Resume capability is critical** - migration script correctly preserved successful uploads
4. **User instinct was correct** - stopped before database cutover to verify uploads

## Next Actions

1. ✅ **DONE**: Create retry script for failed migrations
2. ⏳ **TODO**: Investigate ImageKit `/public/` folder
3. ⏳ **TODO**: Run retry script to complete migration
4. ⏳ **TODO**: Verify 100% success before cutover
5. ⏳ **TODO**: Execute database cutover
6. ⏳ **TODO**: Test website thoroughly

---

**Note**: This diagnosis was created to document the migration failure pattern and provide a clear path forward. The issue is straightforward - wrong credential type - and the solution is to retry with correct credentials.
