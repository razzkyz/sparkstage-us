# R2 Upload Migration Plan

**Date:** 2026-06-10
**Status:** Planning Phase
**Goal:** Migrate product image uploads from ImageKit to Cloudflare R2

---

## 🎯 OBJECTIVE

Change upload flow from:
```
Frontend → ImageKit SDK → ImageKit Storage → Database (imagekit URLs)
```

To:
```
Frontend → Supabase Edge Function → R2 Presigned URL → R2 Storage → Database (R2 URLs)
```

---

## 📊 CURRENT UPLOAD FLOW

### **Frontend:**
1. User selects image in admin panel
2. `publicImagekitUpload.ts` uploads to ImageKit
3. ImageKit returns URL
4. Save URL to database with ImageKit format

### **Files Involved:**
- `frontend/src/lib/publicImagekitUpload.ts` (ImageKit SDK)
- `frontend/src/pages/admin/RetailProductManager.tsx` (Product admin)
- `supabase/functions/imagekit-auth/index.ts` (ImageKit auth backend)
- `supabase/functions/_shared/imagekit.ts` (ImageKit helpers)

---

## 🔧 REQUIRED CHANGES

### **Phase 1: Backend - R2 Upload Function**

**Create new Supabase Edge Function:**
- `supabase/functions/r2-upload-url/index.ts`

**Function will:**
1. Generate R2 presigned upload URL
2. Return URL + metadata to frontend
3. Handle CORS for upload

**Environment variables needed:**
```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=sparkstage-public-assets
R2_PUBLIC_URL=https://cdn.sparkstage55.com
```

---

### **Phase 2: Frontend - Upload Logic**

**Create new upload helper:**
- `frontend/src/lib/r2Upload.ts`

**Function will:**
1. Request presigned URL from backend
2. Upload file directly to R2
3. Return public R2 URL
4. Save to database

**Update product manager:**
- `frontend/src/pages/admin/RetailProductManager.tsx`
- Replace ImageKit upload with R2 upload

---

### **Phase 3: Environment Configuration**

**Add R2 credentials:**
- `.env.local` (local development)
- Supabase Edge Function secrets (production)

**R2 CORS configuration:**
- Allow uploads from frontend domain
- Set proper headers

---

### **Phase 4: Testing**

**Test scenarios:**
1. Upload single image ✅
2. Upload multiple images ✅
3. Replace existing image ✅
4. Delete image (cleanup R2) ✅
5. Verify database URLs correct ✅
6. Verify images display on website ✅

---

## 🛡️ SAFETY MEASURES

### **Rollback Plan:**
1. Keep ImageKit upload code (backup)
2. Feature flag to switch between providers
3. Test in development first
4. Gradual rollout to production

### **Backup Strategy:**
- ImageKit credentials still valid
- Can revert code changes
- Database backup before deployment

---

## 📋 IMPLEMENTATION STEPS

### **STEP 1: Check R2 Credentials**

**You'll need:**
- R2 Account ID
- R2 Access Key ID
- R2 Secret Access Key
- Bucket name: `sparkstage-public-assets`

**Get from:** Cloudflare Dashboard → R2 → Manage R2 API Tokens

---

### **STEP 2: Create R2 Upload Edge Function**

**File:** `supabase/functions/r2-upload-url/index.ts`

Generate presigned upload URL for R2.

---

### **STEP 3: Create Frontend R2 Upload Helper**

**File:** `frontend/src/lib/r2Upload.ts`

Replace ImageKit upload logic.

---

### **STEP 4: Update Product Manager**

**File:** `frontend/src/pages/admin/RetailProductManager.tsx`

Switch from ImageKit upload to R2 upload.

---

### **STEP 5: Configure Environment**

Add R2 credentials to:
- `.env.local` (development)
- Supabase secrets (production)

---

### **STEP 6: Test Locally**

```bash
npm run dev
```

Test upload in admin panel (localhost).

---

### **STEP 7: Deploy to Production**

```bash
npm run build
npm run supabase:functions:deploy
```

Deploy Edge Function + Frontend.

---

### **STEP 8: Monitor**

- Test upload in production admin
- Verify new images appear correctly
- Monitor error logs

---

## ⏰ ESTIMATED TIMELINE

### **Development:**
- Backend (Edge Function): 1 hour
- Frontend (Upload helper): 1 hour  
- Integration: 30 minutes
- **Total dev time: ~2.5 hours**

### **Testing:**
- Local testing: 30 minutes
- Production testing: 30 minutes
- Bug fixes: 1 hour buffer
- **Total test time: ~2 hours**

### **Deployment:**
- Deploy Edge Function: 5 minutes
- Deploy Frontend: 5 minutes
- Smoke testing: 15 minutes
- **Total deploy time: ~25 minutes**

**GRAND TOTAL: ~5 hours** (conservative estimate)

---

## 💰 COST COMPARISON

### **Current (Mixed):**
```
Existing images (2,227): R2 → FREE
New uploads: ImageKit → ~Rp 5K-20K/month
```

### **After Migration:**
```
All images: R2 → FREE
Storage cost: ~$0.50/month (~Rp 8K)
Egress cost: $0.00 (zero via custom domain)
```

**Additional savings: Rp 5K-20K/month**
**Can cancel ImageKit subscription: Save Rp 200K-500K/year**

---

## 🚧 RISKS & MITIGATION

### **Risk 1: Upload Breaks in Production**
**Mitigation:**
- Test thoroughly in development
- Keep ImageKit code as fallback
- Feature flag to switch providers

### **Risk 2: CORS Issues**
**Mitigation:**
- Configure R2 CORS properly
- Test from production domain
- Have CORS troubleshoot guide ready

### **Risk 3: Slow Uploads**
**Mitigation:**
- Use R2 presigned URLs (direct upload)
- No backend proxy (faster)
- Same or better performance than ImageKit

### **Risk 4: Image Not Appearing After Upload**
**Mitigation:**
- Verify R2 public access enabled
- Test URL pattern matches existing images
- Database URL format consistent

---

## 📞 SUPPORT NEEDED

**From You:**
1. R2 API credentials (Account ID, Access Key, Secret Key)
2. Permission to modify upload code
3. Time window for testing (30 mins - 1 hour)
4. Approval to deploy to production

**From Me:**
1. Write all code (Backend + Frontend)
2. Test locally if possible
3. Guide deployment steps
4. Troubleshoot issues

---

## 🎯 NEXT STEPS

### **Option A: Start Now (Recommended)**
1. Get R2 API credentials
2. I write the code
3. Test locally
4. Deploy to production
5. Monitor

**Time commitment: ~3-5 hours total**

### **Option B: Start Later**
1. Test existing R2 migration first (1-2 days)
2. Confirm no issues with current setup
3. Schedule upload migration later

**Time commitment: Whenever you're ready**

---

## ✅ READY TO START?

**Say "start upload migration" and provide:**
1. R2 Account ID
2. R2 Access Key ID  
3. R2 Secret Access Key

**Or say "pause" if you want to test current setup first.**

---

**Your call!** 🚀
