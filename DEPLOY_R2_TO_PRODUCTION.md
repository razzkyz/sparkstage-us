# 🚀 Deploy R2 to Production - No Docker Needed!

**Strategy:** Skip local testing, deploy directly to production and test there.

---

## 📋 Pre-Deploy Checklist

### Local Changes Ready:
- [x] `.env.local` configured with R2
- [x] R2 bucket created: `sparkstage-us-assets`
- [x] Custom domain active: `cdn-us.sparkstage55.com`
- [x] Upload test passed locally

### Need to Deploy:
- [ ] Set Supabase production secrets
- [ ] Push code to GitHub
- [ ] Test Edge Function in production

---

## 🔐 Step 1: Set Supabase Production Secrets

**R2 credentials must be set via Supabase CLI** (not in `.env` file):

```bash
# Set R2 secrets in production
supabase secrets set R2_ENDPOINT=https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
supabase secrets set R2_ACCOUNT_ID=58103a6169fd3011a58d558c15adb7c6
supabase secrets set R2_ACCESS_KEY_ID=98eaa698e2edca5cc23ed52b03cec8d9
supabase secrets set R2_SECRET_ACCESS_KEY=fb9d4deb43017dd9902d12ccebfbbd8164571339850fc4fb2a60d5a5df6f041e
supabase secrets set R2_BUCKET_NAME=sparkstage-us-assets
supabase secrets set R2_PUBLIC_URL=https://cdn-us.sparkstage55.com
```

**Verify secrets:**
```bash
supabase secrets list
```

---

## 📦 Step 2: Update Frontend Environment

**File:** `.env` (for Vercel/production frontend)

Add R2 public URL for frontend image display:

```bash
# Cloudflare R2 Public URL (for displaying images)
VITE_R2_PUBLIC_URL=https://cdn-us.sparkstage55.com
```

**Note:** Frontend only needs public URL, not credentials!

---

## 🗂️ Step 3: Commit & Push

### Check what's changed:
```bash
git status
```

### Stage R2 files:
```bash
# Add environment files (without secrets!)
git add .env
git add .env.example

# Add documentation
git add R2_SUCCESS.md
git add DEPLOY_R2_TO_PRODUCTION.md
git add R2_MIGRATION_US_VERSION.md

# Add test scripts
git add scripts/test-r2-upload-direct.mjs

# Add any other changes
git add -A
```

### Commit:
```bash
git commit -m "feat: Add R2 storage setup for US version

- Add R2 bucket configuration
- Add custom domain: cdn-us.sparkstage55.com  
- Add R2 upload test scripts
- Ready for ImageKit → R2 migration
- Zero egress cost with custom domain"
```

### Push:
```bash
git push origin main
```

---

## 🧪 Step 4: Test Edge Function in Production

### Option A: Test via curl (with auth token)

1. Login to your US app: `https://your-app.vercel.app`
2. Open DevTools → Application → Local Storage
3. Copy value of key: `sb-advzkhuulbaztolnttfl-auth-token`
4. Extract `access_token` from JSON

```bash
curl -X POST https://advzkhuulbaztolnttfl.supabase.co/functions/v1/r2-upload-url \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","fileType":"image/jpeg","productId":1}'
```

### Option B: Test via Frontend

1. Deploy frontend to Vercel
2. Login as admin
3. Go to: `/admin/retail-products`
4. Try upload product image
5. Check browser console for errors

---

## 🔄 Step 5: Update Upload Code (Later)

**For now:** R2 infrastructure ready, but frontend still uses ImageKit

**Later (when ready to migrate):**
1. Remove ImageKit Edge Functions
2. Update `uploadProductImage.ts` to use `r2-upload-url`
3. Remove `@imagekit/javascript` package
4. Test upload in production

**Guide:** See `R2_MIGRATION_US_VERSION.md` for code migration details

---

## 🎯 Alternative: Deploy Edge Function Only

If you just want to make `r2-upload-url` available in production:

```bash
# Deploy single function (no Docker needed)
supabase functions deploy r2-upload-url
```

This deploys just the R2 upload function without affecting other services.

---

## 📝 Quick Commands Summary

```bash
# Set all R2 secrets at once (copy-paste this whole block)
supabase secrets set \
  R2_ENDPOINT=https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com \
  R2_ACCOUNT_ID=58103a6169fd3011a58d558c15adb7c6 \
  R2_ACCESS_KEY_ID=98eaa698e2edca5cc23ed52b03cec8d9 \
  R2_SECRET_ACCESS_KEY=fb9d4deb43017dd9902d12ccebfbbd8164571339850fc4fb2a60d5a5df6f041e \
  R2_BUCKET_NAME=sparkstage-us-assets \
  R2_PUBLIC_URL=https://cdn-us.sparkstage55.com

# Verify
supabase secrets list

# Deploy Edge Function
supabase functions deploy r2-upload-url

# Push code
git add -A
git commit -m "feat: Add R2 storage configuration"
git push origin main
```

---

## ⚠️ Important Notes

### DO NOT commit to Git:
- ❌ `.env.local` (has secrets)
- ❌ R2 credentials in any file
- ✅ Only commit `.env` and `.env.example` (without secrets)

### Secrets belong in:
- ✅ Supabase: `supabase secrets set`
- ✅ Vercel: Environment Variables in dashboard
- ✅ Local dev: `.env.local` (git-ignored)

---

## 🎉 Success Criteria

After deployment:
- ✅ Supabase secrets set
- ✅ Code pushed to GitHub
- ✅ Edge Function accessible in production
- ✅ curl test returns presigned URL
- ⏸️ Frontend upload (later, after code migration)

---

**Next:** Set secrets and push! No Docker needed! 🚀
