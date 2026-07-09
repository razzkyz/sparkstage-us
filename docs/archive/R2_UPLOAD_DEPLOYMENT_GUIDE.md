# R2 Upload Deployment Guide

**Date:** 2026-06-10
**Status:** Ready to Deploy
**Estimated Time:** 30-45 minutes

---

## 🎯 WHAT WE'RE DEPLOYING

**New upload flow:**
- Frontend uploads directly to R2 via presigned URLs
- No ImageKit SDK dependency for new uploads
- Existing 2,227 images remain on R2 (already migrated)
- New uploads also go to R2

**Files created:**
1. ✅ `.env.r2-upload` - R2 credentials
2. ✅ `supabase/functions/r2-upload-url/index.ts` - Backend Edge Function
3. ✅ `frontend/src/lib/r2Upload.ts` - Frontend upload helper
4. ⏸️ Need to update: `frontend/src/pages/admin/RetailProductManager.tsx`

---

## 📋 DEPLOYMENT STEPS

### **STEP 1: Add R2 Credentials to Supabase Secrets** (5 minutes)

**Open terminal and run:**

```bash
cd c:\SparkDoku\sparkstage

# Set R2 secrets for Edge Function
npx supabase secrets set R2_ACCOUNT_ID="58103a6169fd3011a58d558c15adb7c6"
npx supabase secrets set R2_BUCKET_NAME="sparkstage-public-assets"
npx supabase secrets set R2_ACCESS_KEY_ID="06ba5bc801b1617527e7ca0fa6c44e0b"
npx supabase secrets set R2_SECRET_ACCESS_KEY="65697de059212632e4f46e957b9654beaf2eb15c1b6157e6590512019f9637d5"
npx supabase secrets set R2_ENDPOINT="https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com"
npx supabase secrets set R2_PUBLIC_URL="https://cdn.sparkstage55.com"
```

**Expected output:**
```
✔ Saved secrets
```

---

### **STEP 2: Deploy R2 Upload Edge Function** (5 minutes)

**Run:**

```bash
npx supabase functions deploy r2-upload-url --no-verify-jwt
```

**Expected output:**
```
Deploying function r2-upload-url...
✔ Function deployed successfully
URL: https://[your-project].supabase.co/functions/v1/r2-upload-url
```

---

### **STEP 3: Test Edge Function** (5 minutes)

**Get auth token from browser:**
1. Open website: `https://www.sparkstage55.com`
2. Login as admin
3. Open DevTools (F12) → Console
4. Run: `localStorage.getItem('supabase.auth.token')`
5. Copy the `access_token` value

**Test with curl:**

```bash
curl -X POST https://[your-project-ref].supabase.co/functions/v1/r2-upload-url \
  -H "Authorization: Bearer [your-access-token]" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","fileType":"image/jpeg","productId":1}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...r2.cloudflarestorage.com/...",
    "publicUrl": "https://cdn.sparkstage55.com/products/1/...",
    "key": "products/1/...",
    "fileName": "..."
  }
}
```

---

### **STEP 4: Update Frontend Environment** (2 minutes)

**Add to `.env.local`:**

```env
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_USE_R2_UPLOAD=true
```

---

### **STEP 5: Update Product Manager** (Already prepared)

I'll provide the updated `RetailProductManager.tsx` with R2 upload integration.

The file will:
- Import `uploadToR2` instead of `uploadPublicAssetToImageKit`
- Use environment variable to switch between providers
- Keep ImageKit as fallback

---

### **STEP 6: Build and Deploy Frontend** (10 minutes)

**Run:**

```bash
npm run build
```

**Expected:** Build completes successfully ✅

**Deploy to Vercel (if using Vercel):**

```bash
vercel --prod
```

**Or deploy via your CI/CD pipeline.**

---

### **STEP 7: Test Upload in Production** (10 minutes)

1. Login to admin panel: `https://www.sparkstage55.com/admin`
2. Go to: **Retail Product Manager**
3. Click: **Add New Product**
4. Fill form and **upload image**
5. Save product
6. Verify:
   - Image uploads successfully ✅
   - Product image displays correctly ✅
   - Database URL is `cdn.sparkstage55.com` ✅

---

## 🔄 ROLLBACK PLAN

**If upload fails in production:**

### **Quick Rollback (5 minutes):**

**Update `.env.local`:**

```env
VITE_USE_R2_UPLOAD=false
```

**Rebuild and redeploy:**

```bash
npm run build
vercel --prod
```

**This switches back to ImageKit upload immediately.**

---

### **Full Rollback (if needed):**

1. Revert frontend code changes
2. Remove Edge Function: `npx supabase functions delete r2-upload-url`
3. Rebuild and redeploy

---

## ⚠️ IMPORTANT NOTES

### **About Feature Flag:**

The updated code will check `VITE_USE_R2_UPLOAD` environment variable:
- `true` → Use R2 upload
- `false` or undefined → Use ImageKit upload (fallback)

This allows easy switching between providers without code changes.

---

### **About Existing Images:**

- ✅ 2,227 existing images already on R2 (from previous migration)
- ✅ They will continue to work
- ✅ New uploads will also go to R2
- ✅ No mixed provider issues

---

### **About ImageKit:**

- Can keep ImageKit subscription active (safety net)
- Or cancel after 30 days of stable R2 uploads
- Credentials still in code (fallback)

---

## 📊 SUCCESS CRITERIA

Migration successful if:
- ✅ Edge Function deploys without errors
- ✅ Test upload works in local development
- ✅ Test upload works in production admin
- ✅ New product images display correctly on website
- ✅ Database URLs are `cdn.sparkstage55.com/products/...`
- ✅ No upload errors for 24 hours

---

## 🎯 NEXT STEP

**I need to update `RetailProductManager.tsx` with R2 integration.**

**This will:**
1. Add feature flag check
2. Switch to R2 upload when enabled
3. Keep ImageKit as fallback
4. Maintain same UI/UX

**Ready for me to update the file?**

Type **"update product manager"** and I'll proceed! 🚀
