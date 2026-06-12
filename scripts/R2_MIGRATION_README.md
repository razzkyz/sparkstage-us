# R2 Migration Scripts

Scripts untuk migrasi gambar dari ImageKit ke Cloudflare R2.

## 📁 Files

### Migration Scripts

- **`migrate-imagekit-to-r2.mjs`** - Main migration script (download dari ImageKit → upload ke R2)
- **`r2-migration-status.mjs`** - Check status migrasi
- **`r2-cutover-database.mjs`** - Update database URLs dari ImageKit ke R2
- **`verify-r2-urls.mjs`** - Verify R2 URLs accessible

### Supporting Files

- **`.env.r2-migration.example`** - Template environment variables
- **`.env.r2-migration`** - Your actual credentials (git-ignored)

## 🚀 Quick Commands

```bash
# Setup
copy .env.r2-migration.example .env.r2-migration
# Edit .env.r2-migration dengan R2 credentials

# Testing
npm run r2:migrate:dry                # Dry run (no changes)
npm run r2:migrate -- --limit 25      # Test 25 images

# Migration
npm run r2:migrate                    # Full migration
npm run r2:migrate:status             # Check progress

# Verification
npm run r2:verify                     # Verify URLs work

# Cutover (database update)
npm run r2:cutover:dry               # Test cutover
npm run r2:cutover:confirm           # Actual cutover (production!)
```

## 📝 Script Details

### migrate-imagekit-to-r2.mjs

**Purpose**: Download images from ImageKit and upload to R2

**Features**:
- Resume support (auto-skip completed)
- Batch processing
- Concurrent uploads
- Progress logging
- Error handling

**Arguments**:
```bash
--env-file <path>        # Env file (default: .env.r2-migration)
--batch-size <number>    # Batch size (default: 25)
--limit <number>         # Limit total rows
--concurrency <number>   # Concurrent uploads (default: 3)
--start-after-id <id>    # Resume from specific ID
--only-product-id <id>   # Migrate only one product
--dry-run                # Test without uploading
--no-resume              # Ignore previous runs
--skip-download          # Use cached files
--fail-fast              # Stop on first error
```

**Examples**:
```bash
# Test with 25 images
npm run r2:migrate -- --batch-size 25 --limit 25

# Full migration with high concurrency
npm run r2:migrate -- --concurrency 5

# Resume from specific ID
npm run r2:migrate -- --start-after-id 1000

# Migrate one product only
npm run r2:migrate -- --only-product-id 123

# Use cached downloads (faster retry)
npm run r2:migrate -- --skip-download
```

**Output Files**:
- `backups/r2-migration-manifest.jsonl` - All migration records (1 JSON per line)
- `backups/r2-migration-summary.json` - Summary statistics
- `backups/r2-migration-temp/` - Temporary download folder

### r2-migration-status.mjs

**Purpose**: Check migration progress and statistics

**Output**:
```
Database Status:
  ImageKit provider: 2117 rows
  R2 provider: 0 rows

Migration Manifest:
  Total entries: 2117
  Success: 2117
  Failed: 0

Progress:
  Migrated: 2117 / 2117 (100.00%)
  Remaining: 0
```

**Arguments**:
```bash
--env-file <path>    # Env file
--manifest <path>    # Manifest path
```

### r2-cutover-database.mjs

**Purpose**: Update database to use R2 URLs (production cutover)

**⚠️ WARNING**: This updates production database!

**Features**:
- Dry run support
- Batch updates
- Rollback instructions if issues

**Arguments**:
```bash
--env-file <path>    # Env file
--manifest <path>    # Manifest path
--dry-run            # Test without updating
--confirm            # Actual update (PRODUCTION!)
--batch-size <n>     # Update batch size (default: 100)
```

**Usage**:
```bash
# Always dry run first!
npm run r2:cutover:dry

# Review output, then confirm
npm run r2:cutover:confirm
```

**Rollback** (if issues after cutover):
```sql
UPDATE product_images
SET 
  image_url = provider_original_url,
  image_provider = 'imagekit'
WHERE image_provider = 'r2' 
  AND provider_original_url IS NOT NULL;
```

### verify-r2-urls.mjs

**Purpose**: Verify R2 URLs are accessible

**Features**:
- Random sampling
- HTTP HEAD requests (fast)
- Response time tracking
- Error reporting

**Arguments**:
```bash
--manifest <path>       # Manifest path
--sample-size <number>  # Sample size (default: 20)
--timeout <ms>          # Request timeout (default: 10000)
```

**Examples**:
```bash
# Test 20 random URLs
npm run r2:verify

# Test 50 URLs
npm run r2:verify -- --sample-size 50

# Quick test with 5 URLs
npm run r2:verify -- --sample-size 5
```

**Output**:
```
✅ [200] Product 123 (245ms)
   https://media.sparkstage55.com/products/123/image.jpg
   Type: image/jpeg, Size: 102400

Summary:
  Tested: 20
  Passed: 20 (100.00%)
  Failed: 0 (0.00%)
```

## 🔧 Environment Variables

Create `.env.r2-migration` with:

```env
# Cloudflare R2 (REQUIRED)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=sparkstage-public-assets
R2_BASE_PATH=products
R2_PUBLIC_BASE_URL=https://media.sparkstage55.com

# Supabase (OPTIONAL - auto-detected from CLI)
SUPABASE_URL=https://hogzjapnkvsihvvbgcdb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Get R2 credentials**:
1. [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Create bucket
3. Manage R2 API Tokens → Create token
4. Copy Account ID, Access Key ID, Secret Access Key

## 📊 Migration Workflow

```
1. Setup
   ├─ Create R2 bucket
   ├─ Get API credentials
   └─ Configure .env.r2-migration

2. Testing
   ├─ npm run r2:migrate:dry
   ├─ npm run r2:migrate -- --limit 25
   └─ npm run r2:verify

3. Full Migration
   ├─ npm run r2:migrate
   └─ npm run r2:migrate:status

4. Soak Period (24-48h)
   └─ npm run r2:verify daily

5. Cutover
   ├─ npm run r2:cutover:dry
   └─ npm run r2:cutover:confirm

6. Monitoring (7-14 days)
   └─ Verify website, metrics

7. Cleanup
   └─ Cancel ImageKit ($9/month saved!)
```

## 🐛 Troubleshooting

### Migration fails with "fetch failed"

**Problem**: Network issues or R2 credentials invalid

**Solution**:
```bash
# Test R2 connection
curl https://your-account.r2.cloudflarestorage.com/your-bucket/test.txt

# Verify credentials in .env.r2-migration
# Try with lower concurrency
npm run r2:migrate -- --concurrency 1
```

### URLs return 403 Forbidden

**Problem**: R2 bucket not public

**Solution**:
1. Open R2 bucket in Cloudflare dashboard
2. Settings → Public Access → Enable
3. Verify with: `npm run r2:verify -- --sample-size 5`

### URLs return 404 Not Found

**Problem**: Files not uploaded or wrong path

**Solution**:
```bash
# Check manifest for successful uploads
cat backups/r2-migration-manifest.jsonl | grep "success"

# Verify in R2 dashboard - browse bucket files
# Re-run migration for failed items
npm run r2:migrate:status
npm run r2:migrate  # Resume will skip successful
```

### Custom domain not working

**Problem**: DNS not configured

**Solution**:
1. Check DNS: `nslookup media.sparkstage55.com`
2. Wait 5-10 minutes for propagation
3. Test with r2.dev URL temporarily:
   ```env
   R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
   ```

### Migration stuck/slow

**Problem**: Large files or slow connection

**Solution**:
```bash
# Increase timeout (in code) or
# Lower concurrency
npm run r2:migrate -- --concurrency 1 --batch-size 10

# Use cached downloads if retrying
npm run r2:migrate -- --skip-download
```

## 📈 Performance Tips

1. **Optimal concurrency**: 3-5 for most connections
2. **Batch size**: 25-50 works well
3. **Skip downloads**: Use `--skip-download` if retrying (files cached locally)
4. **Monitor**: Watch R2 dashboard during migration
5. **Low traffic time**: Run migration during low traffic hours

## 🔐 Security

- `.env.r2-migration` is git-ignored
- Never commit R2 credentials to git
- Use API tokens with minimal permissions (Object Read & Write only)
- Rotate tokens after migration if concerned

## 📚 Documentation

- **Full guide**: `../docs/runbooks/r2-migration.md`
- **Quick start**: `../docs/runbooks/R2_MIGRATION_QUICKSTART.md`
- **Checklist**: `../R2_MIGRATION_CHECKLIST.md`

## 💡 Tips

- Always test with `--dry-run` first
- Always test with `--limit 25` before full migration
- Always verify URLs before cutover
- Keep ImageKit active 30 days as backup
- Archive manifest files for audit trail

## ⚠️ Important Notes

1. **DO NOT** delete ImageKit files until 30 days post-cutover
2. **DO NOT** cancel ImageKit subscription until 14 days monitoring
3. **DO** backup manifest files (`backups/r2-migration-manifest.jsonl`)
4. **DO** test verification script daily during soak period
5. **DO** have rollback SQL ready during cutover

---

**Need Help?** Check full documentation or review script code for implementation details.
