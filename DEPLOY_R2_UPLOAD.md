# Quick Deploy R2 Upload - Command Reference

**Copy-paste these commands in order** 🚀

---

## 🎯 STEP 1: SET R2 SECRETS (5 min)

```bash
cd c:\SparkDoku\sparkstage

npx supabase secrets set R2_ACCOUNT_ID="58103a6169fd3011a58d558c15adb7c6"
npx supabase secrets set R2_BUCKET_NAME="sparkstage-public-assets"
npx supabase secrets set R2_ACCESS_KEY_ID="06ba5bc801b1617527e7ca0fa6c44e0b"
npx supabase secrets set R2_SECRET_ACCESS_KEY="65697de059212632e4f46e957b9654beaf2eb15c1b6157e6590512019f9637d5"
npx supabase secrets set R2_ENDPOINT="https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com"
npx supabase secrets set R2_PUBLIC_URL="https://cdn.sparkstage55.com"
```

**Expected:** `✔ Saved secrets`

---

## 🎯 STEP 2: DEPLOY EDGE FUNCTION (5 min)

```bash
npx supabase functions deploy r2-upload-url --no-verify-jwt
```

**Expected:** `✔ Function deployed successfully`

---

## 🎯 STEP 3: ADD ENV VARIABLE (1 min)

**Open:** `.env.local` (create if not exists)

**Add this line:**
```env
VITE_USE_R2_UPLOAD=true
```

**Save file** ✅

---

## 🎯 STEP 4: BUILD FRONTEND (5 min)

```bash
npm run build
```

**Expected:** Build completes with no errors ✅

---

## 🎯 STEP 5: DEPLOY TO PRODUCTION (5 min)

**If using Vercel:**
```bash
vercel --prod
```

**If using other hosting:**
- Deploy `dist/` folder to your hosting
- Or push to git (triggers CI/CD)

---

## 🎯 STEP 6: TEST IN PRODUCTION (10 min)

1. Open: `https://www.sparkstage55.com/admin`
2. Login as admin
3. Go to: **Retail Product Manager**
4. Click: **Add New Product**
5. Fill form and upload image
6. Save
7. Verify image appears correctly ✅

---

## 🔄 ROLLBACK (if needed)

**Update `.env.local`:**
```env
VITE_USE_R2_UPLOAD=false
```

**Rebuild:**
```bash
npm run build
vercel --prod
```

**Done!** Switches back to ImageKit immediately.

---

## 📊 VERIFY SUCCESS

**Check database URL:**
```sql
SELECT image_url 
FROM product_images 
ORDER BY id DESC 
LIMIT 1;
```

**Expected:** `https://cdn.sparkstage55.com/products/...`

---

**Total time: ~30 minutes**

**Good luck! 🚀**
