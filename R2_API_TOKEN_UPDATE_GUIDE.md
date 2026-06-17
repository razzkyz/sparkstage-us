# 🔑 Update R2 API Token untuk US Bucket

**Problem:** API token yang ada hanya untuk bucket Indonesia (`sparkstage-public-assets`)  
**Solution:** Update token untuk include bucket US (`sparkstage-us-assets`)

---

## 🎯 Option 1: Update Existing Token (Recommended)

### Step 1: Go to Cloudflare Dashboard
```
https://dash.cloudflare.com/
```

### Step 2: Manage API Tokens
1. Click **R2** di sidebar
2. Click **Manage R2 API Tokens** (kanan atas)
3. Cari token yang sedang dipakai (cek di `.env.r2-migration`)

### Step 3: Update Token Permissions
**Cara 1 - Edit Token (jika bisa):**
1. Click **Edit** pada token
2. Di bagian **Apply to specific buckets**, add:
   - ✅ `sparkstage-public-assets` (existing)
   - ✅ `sparkstage-us-assets` (new)
3. Click **Update Token**

**Cara 2 - Create New Token (jika edit tidak bisa):**
1. Click **Create API token**
2. Token name: `sparkstage-multi-bucket`
3. Permissions: **Object Read & Write**
4. Apply to specific buckets:
   - ✅ `sparkstage-public-assets`
   - ✅ `sparkstage-us-assets`
5. TTL: Leave blank (no expiry)
6. Click **Create API Token**
7. **⚠️ COPY credentials sekarang:**
   - Access Key ID
   - Secret Access Key

### Step 4: Update `.env.local`
```bash
# Jika buat token baru, update dengan credentials baru
R2_ACCESS_KEY_ID=<NEW_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<NEW_SECRET_ACCESS_KEY>

# Bucket name tetap
R2_BUCKET_NAME=sparkstage-us-assets
```

---

## 🎯 Option 2: Allow All Buckets (Simplest)

### Create Token dengan All Buckets Access:

1. Go to: https://dash.cloudflare.com/ → R2 → Manage R2 API Tokens
2. Click **Create API token**
3. Token name: `sparkstage-all-buckets`
4. Permissions: **Object Read & Write**
5. Apply to: **All buckets** (instead of specific)
6. TTL: Leave blank
7. Click **Create API Token**
8. Copy credentials

**Pros:**
- ✅ Works for semua buckets (Indo + US + future)
- ✅ No need update token lagi

**Cons:**
- ⚠️ Broader access (security consideration)

---

## 🧪 Test After Update

### Step 1: Update `.env.local`
```bash
# Update if new token
R2_ACCESS_KEY_ID=<YOUR_NEW_KEY>
R2_SECRET_ACCESS_KEY=<YOUR_NEW_SECRET>
```

### Step 2: Run Test
```bash
node scripts/test-r2-upload.mjs
```

**Expected output:**
```
✅ Found 2 bucket(s):
    sparkstage-public-assets
  → sparkstage-us-assets (target)

✅ File uploaded: test/upload-test-xxxxx.txt
✅ File verified in R2
✅ R2 Upload Test PASSED!
```

---

## 📋 Quick Checklist

Current Setup:
- [x] Bucket `sparkstage-us-assets` created
- [x] R2 credentials in `.env.local`
- [x] Test script ready

Need to do:
- [ ] Update API token to include US bucket
- [ ] Update `.env.local` if new token
- [ ] Run test: `node scripts/test-r2-upload.mjs`
- [ ] Get R2.dev public URL from dashboard
- [ ] Update `R2_PUBLIC_URL` in `.env.local`

---

## 🌐 Get Public URL

After token update and test passed:

1. Go to: https://dash.cloudflare.com/ → R2
2. Click bucket: **sparkstage-us-assets**
3. Click tab: **Settings**
4. Section: **Public Access**
5. Enable: **Allow Access** (if not enabled)
6. Copy: **R2.dev subdomain**
   - Example: `https://pub-abc123xyz.r2.dev`

Update `.env.local`:
```bash
R2_PUBLIC_URL=https://pub-abc123xyz.r2.dev
```

---

## 🚀 After Setup Complete

Test Edge Function:
```bash
# Terminal 1: Start Edge Functions
npm run supabase:functions:serve

# Terminal 2: Test upload endpoint
# (needs auth token from logged in user)
```

Test frontend upload:
```bash
npm run dev
# Go to: http://localhost:5174/admin/retail-products
# Try upload product image
```

---

**Next:** Update API token di Cloudflare Dashboard! 🔑
