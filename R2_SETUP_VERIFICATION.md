# 🔍 R2 Setup Verification - Troubleshooting

## ❌ Current Error: Access Denied (403)

```
R2 list failed (403): Access Denied
```

**Penyebab Umum**:
1. Bucket `sparkstage-public-assets` belum dibuat
2. API Token tidak punya permission untuk bucket ini
3. API Token scope tidak include bucket ini

---

## ✅ CHECKLIST: Verifikasi Setup R2

### Step 1: Verify Bucket Exists

1. Login https://dash.cloudflare.com
2. Sidebar → **R2 Object Storage**
3. Check list buckets:
   
   **Expected**:
   ```
   ✓ sparkstage-public-assets
   ```
   
   **Jika TIDAK ada**:
   - Click **Create bucket**
   - Bucket name: `sparkstage-public-assets`
   - Location: **Automatic**
   - Click **Create bucket**

### Step 2: Verify Public Access Enabled

**Ini WAJIB untuk zero egress cost!**

1. Click bucket: `sparkstage-public-assets`
2. Tab **Settings**
3. Scroll ke section **Public access**
4. Status harus: **✅ Enabled**
   
   **Jika masih 🔒 Disabled**:
   - Click **Allow Access**
   - Centang "I understand that anyone will be able to access objects..."
   - Click **Allow Access**
   
5. **COPY Public Bucket URL** (harus muncul setelah enabled):
   ```
   https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
   ```

### Step 3: Verify API Token Permissions

1. R2 Dashboard → **Manage R2 API Tokens**
2. Cari token: `sparkstage-r2-migration` (atau nama yang kamu buat)
3. Check details:
   
   **Expected permissions**:
   ```
   Permissions: Object Read & Write
   Bucket scope: Apply to specific buckets only
   Buckets: sparkstage-public-assets
   ```
   
   **Jika salah**:
   - **Delete token lama** (click ... → Delete)
   - **Create token baru**:
     - Name: `sparkstage-r2-migration`
     - Permissions: ☑️ **Object Read & Write**
     - Scope: ⦿ **Apply to specific buckets only**
     - Select buckets: ☑️ **sparkstage-public-assets**
     - TTL: **Forever**
   - Click **Create API Token**
   - **COPY credentials baru** (Access Key ID + Secret Access Key)

### Step 4: Test Upload via R2 Dashboard (Manual Test)

1. Masuk ke bucket `sparkstage-public-assets`
2. Click **Upload**
3. Select any image file (test.jpg)
4. Click **Upload**
5. File harus muncul di bucket

### Step 5: Test Public URL (Manual Test)

1. Setelah upload file test.jpg
2. Copy public URL:
   ```
   https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com/test.jpg
   ```
3. Buka di browser atau curl:
   ```powershell
   curl -I https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com/test.jpg
   ```
4. **Expected**: `HTTP/2 200` (tanpa auth!)
5. **Jika 403**: Public access belum enabled (kembali ke Step 2)

---

## 🔧 Common Issues & Fixes

### Issue 1: Bucket Tidak Ada

**Symptoms**: 403 Access Denied atau 404 Not Found

**Fix**:
```
1. R2 Dashboard → Create bucket
2. Name: sparkstage-public-assets
3. Create
```

### Issue 2: Token Scope Salah

**Symptoms**: 403 Access Denied (credentials benar, bucket ada)

**Fix**:
```
1. Delete token lama
2. Create token baru dengan scope "Apply to specific buckets only"
3. WAJIB select bucket: sparkstage-public-assets
4. Copy credentials baru
```

### Issue 3: Public Access Tidak Enabled

**Symptoms**: curl public URL dapat 403

**Fix**:
```
1. Bucket → Settings → Public access
2. Click "Allow Access"
3. Confirm dialog
4. Verify public URL accessible
```

### Issue 4: Wrong Account

**Symptoms**: Semua setup benar tapi tetap 403

**Fix**:
```
1. Verify Account ID di dashboard (top right, account dropdown)
2. Match dengan Account ID di credentials
3. Update .env.r2-migration jika beda
```

---

## ✅ After Fix: Re-test Connection

Setelah fix issues di atas:

```powershell
node scripts/test-r2-connection.mjs
```

**Expected output**:
```
🧪 Testing Cloudflare R2 Connection...

✓ Loaded environment from: .env.r2-migration
✓ Loaded R2 configuration
  - Account ID: 58103a6169fd3011a58d558c15adb7c6
  - Bucket: sparkstage-public-assets
  - Base Path: products
  - Public URL: https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com

📋 Test 1: Listing bucket contents...
✓ Successfully listed bucket (read access OK)

📤 Test 2: Uploading test file...
✓ Successfully uploaded test file
  - Key: _test_connection.txt
  - ETag: "abc123..."

🌐 Test 3: Verifying public URL configuration...
✓ Public URL format looks good
  - Example URL: https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com/products/123/test.jpg

✅ All tests passed! R2 is ready for migration.
```

---

## 🎯 Quick Diagnostic Commands

```powershell
# Test 1: Check env file loaded
$env:R2_ACCOUNT_ID="58103a6169fd3011a58d558c15adb7c6"
$env:R2_ACCESS_KEY_ID="31d84a35ea53ed36a55c22c8888e7516"
$env:R2_SECRET_ACCESS_KEY="0e0c48090e8d24ecf52cb87aefdeadbc5b70f71166893712580a6e422bad7a99"
$env:R2_BUCKET_NAME="sparkstage-public-assets"
echo "Account: $env:R2_ACCOUNT_ID"
echo "Bucket: $env:R2_BUCKET_NAME"

# Test 2: Check public URL accessible (after upload test file)
curl -I https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com/test.jpg

# Test 3: Re-run connection test
node scripts/test-r2-connection.mjs
```

---

## 📞 Next Steps

**Jika masih error setelah troubleshooting**:

1. Screenshot Cloudflare R2 dashboard:
   - List buckets (harus ada `sparkstage-public-assets`)
   - Bucket settings (public access harus enabled)
   - API tokens list (harus ada token dengan correct permissions)

2. Share error message lengkap

3. Saya akan bantu debug lebih detail

**Jika test connection SUCCESS** ✅:

Lanjut ke migrasi:
```powershell
npm run r2:migrate:dry          # Dry run
npm run r2:migrate:test         # Test 25 images
npm run r2:migrate              # Full migration
```

---

**File ini**: Quick reference untuk troubleshooting R2 setup issues
