# 🎯 R2 Setup - Step by Step (5 Minutes)

## Current Status: ❌ Access Denied (403)

**Possible causes**:
1. Bucket `sparkstage-public-assets` tidak exist
2. Token tidak punya permission untuk bucket ini

Let's fix it step by step! 👇

---

## 📋 STEP-BY-STEP SETUP

### STEP 1: Verify/Create Bucket (2 menit)

1. **Open Cloudflare Dashboard**:
   ```
   https://dash.cloudflare.com
   ```

2. **Navigate to R2**:
   - Left sidebar → Click **R2 Object Storage**
   - Or direct: https://dash.cloudflare.com/?to=/:account/r2

3. **Check Buckets List**:
   
   **Apakah ada bucket bernama `sparkstage-public-assets`?**
   
   **Scenario A: Bucket SUDAH ADA** ✅
   - Good! Go to Step 2
   
   **Scenario B: Bucket BELUM ADA** ❌
   - Click **Create bucket**
   - **Bucket name**: `sparkstage-public-assets` (exactly this name!)
   - **Location**: Automatic (recommended)
   - Click **Create bucket**
   - ✅ Bucket created!

---

### STEP 2: Enable Public Access (1 menit)

**⚠️ THIS IS CRITICAL FOR ZERO EGRESS COST!**

1. **Click bucket**: `sparkstage-public-assets`

2. **Tab**: Settings

3. **Find section**: "Public access"

4. **Check current status**:
   
   **Scenario A: Status = ✅ Enabled**
   - Perfect! Go to Step 3
   
   **Scenario B: Status = 🔒 Disabled**
   - Click button **"Allow Access"**
   - Dialog muncul dengan warning
   - ☑️ Centang "I understand that anyone will be able to access objects in this bucket via the public URL"
   - Click **"Allow Access"**
   - Wait 2-3 seconds
   - Status berubah → ✅ **Public access: Enabled**

5. **Copy Public Bucket URL** (will appear after enabling):
   ```
   https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
   ```
   ✅ This should match the URL in `.env.r2-migration`

---

### STEP 3: Verify/Recreate API Token (2 menit)

**The token MUST have permission for this specific bucket!**

1. **Navigate to R2 API Tokens**:
   - R2 Dashboard → Click **"Manage R2 API Tokens"**
   - Or: Click your account name (top right) → Manage Account → R2 API Tokens

2. **Check existing tokens**:
   - Find token named `sparkstage-r2-migration` (or similar)
   - Click to view details
   
3. **Verify Token Details**:
   
   **Required settings**:
   ```
   Permissions: ✅ Object Read & Write
   
   Bucket access: 
     ⦿ Apply to specific buckets only
     Buckets: ☑️ sparkstage-public-assets
   
   TTL: Forever (or at least 30 days)
   ```
   
   **If token settings are WRONG** ❌:
   - You CANNOT edit token settings
   - Must **DELETE** and recreate
   
4. **Recreate Token** (if needed):
   
   a. **Delete old token**:
      - Click ••• menu → Delete
      - Confirm deletion
   
   b. **Create new token**:
      - Click **"Create API Token"**
      
      **Fill form**:
      ```
      Token name: sparkstage-r2-migration
      
      Permissions:
        ☑️ Object Read & Write
      
      TTL:
        ⦿ Forever
      
      Bucket access:
        ⦿ Apply to specific buckets only
        
        Select buckets:
          ☑️ sparkstage-public-assets   ← MUST be checked!
      ```
      
      - Click **"Create API Token"**
   
   c. **COPY credentials immediately** (can't view again!):
      ```
      Access Key ID: ________________________________
      Secret Access Key: ________________________________
      ```
      
      - Click **"Done"**

5. **If you created NEW token**: Reply dengan credentials baru!

---

### STEP 4: Manual Upload Test (1 menit)

**Test bucket access via UI** (before script):

1. **Go to bucket**: `sparkstage-public-assets`

2. **Click "Upload"**

3. **Select any image file** (test.jpg, screenshot, anything)

4. **Click "Upload"**

5. **Expected**: File appears in bucket ✅

6. **If upload fails**: Token permissions definitely wrong → Redo Step 3

---

### STEP 5: Test Public URL (1 menit)

**Test public access works**:

1. **After uploading test file**, get public URL:
   ```
   https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com/test.jpg
   ```
   (Replace `test.jpg` with your uploaded filename)

2. **Test via browser**:
   - Open URL in browser
   - **Expected**: Image loads directly ✅
   - **If 403**: Public access not enabled → Redo Step 2

3. **Test via curl** (PowerShell):
   ```powershell
   curl -I https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com/test.jpg
   ```
   
   **Expected output**:
   ```
   HTTP/2 200
   content-type: image/jpeg
   ```
   
   **If 403**: Public access not enabled properly

---

## ✅ After All Steps Complete

**You should have**:
- ✅ Bucket `sparkstage-public-assets` exists
- ✅ Public access enabled (status = Enabled)
- ✅ API token with correct permissions (specific bucket scope)
- ✅ Test file uploaded successfully via UI
- ✅ Test file accessible via public URL (no auth needed)
- ✅ Credentials updated in `.env.r2-migration`

**Then run**:
```powershell
node scripts/test-r2-connection.mjs
```

**Expected success output**:
```
✅ All tests passed! R2 is ready for migration.

Next steps:
  1. Run dry-run migration: npm run r2:migrate:dry
  2. Test batch migration: npm run r2:migrate -- --batch-size 25 --limit 25
  3. Check migration status: npm run r2:migrate:status
```

---

## 🚨 Still Getting 403 After All Steps?

**Double-check these**:

1. **Bucket name exactly matches** (case-sensitive):
   - In R2 dashboard: `sparkstage-public-assets`
   - In `.env.r2-migration`: `R2_BUCKET_NAME=sparkstage-public-assets`

2. **Token scope includes THIS bucket**:
   - Token details must show: "Buckets: sparkstage-public-assets"
   - If shows "All buckets" but bucket was created AFTER token → Need to recreate token

3. **Account ID matches**:
   - Get from dashboard (top right, click account name)
   - Should be: `58103a6169fd3011a58d558c15adb7c6`
   - Must match in `.env.r2-migration`

4. **Credentials are latest** (not from previous token):
   - If you recreated token in Step 3, make sure you copied NEW credentials
   - Update `.env.r2-migration` with latest Access Key ID + Secret Access Key

---

## 📞 Need Help?

**Tell me**:
1. Step 1 result: Bucket exists? Yes/No
2. Step 2 result: Public access enabled? Yes/No
3. Step 3 result: Token scope correct? Yes/No (or recreated?)
4. Step 4 result: UI upload worked? Yes/No
5. Step 5 result: Public URL loads? Yes/No (HTTP 200 or 403?)

Then I can help diagnose the exact issue! 🔍

---

**This guide**: Comprehensive setup verification for R2 bucket + token + public access
