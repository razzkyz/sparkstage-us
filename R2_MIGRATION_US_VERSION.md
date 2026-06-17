# 🇺🇸 R2 Migration for SparkStage US Version

**Date:** 2026-06-17  
**Status:** 🎯 **READY TO IMPLEMENT**

---

## 📋 Overview

SparkStage US version will use **Cloudflare R2** for all image storage instead of ImageKit. This is a clean start without legacy ImageKit code.

### Why R2 for US Version?

1. ✅ **Zero egress costs** with custom domain
2. ✅ **No vendor lock-in** (S3-compatible)
3. ✅ **Global CDN** built-in
4. ✅ **Simpler architecture** (no ImageKit SDK needed)
5. ✅ **Indonesia version already using R2** (proven solution)

---

## 🏗️ Architecture

### Image Upload Flow (R2):

```
User → Frontend → Edge Function (r2-upload-url) → Generate Presigned URL
                                                  ↓
User → Direct Upload to R2 → Public URL → Database Record
```

### Image Delivery Flow (R2):

```
Database URL → R2 Custom Domain (CDN) → User
```

**Key Difference from ImageKit:**
- No transformation API needed (use modern responsive images)
- No auth endpoints needed (presigned URLs handle security)
- No SDK needed (native fetch API)

---

## ✅ What's Already Done

### 1. Edge Function: `r2-upload-url` ✅

**Location:** `supabase/functions/r2-upload-url/index.ts`

**Features:**
- ✅ Generates presigned upload URLs (10 min expiry)
- ✅ Supports image validation (JPEG, PNG, WebP, GIF)
- ✅ Unique file names with UUID
- ✅ Product-based folder structure: `products/{productId}/{uuid}.ext`
- ✅ Returns public URL for database storage

**Usage:**
```typescript
const response = await supabase.functions.invoke('r2-upload-url', {
  body: {
    fileName: 'product.jpg',
    fileType: 'image/jpeg',
    productId: 123
  }
})

const { uploadUrl, publicUrl } = response.data
```

### 2. Environment Variables Structure ✅

**Required in `.env.local`:**
```bash
# R2 Configuration
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=sparkstage-us-assets
R2_PUBLIC_URL=https://cdn-us.sparkstage55.com
```

---

## 🎯 What Needs To Be Done

### Phase 1: R2 Setup (30 minutes)

#### Step 1.1: Create R2 Bucket
```bash
# Via Cloudflare Dashboard
1. Go to R2 → Create Bucket
2. Name: sparkstage-us-assets
3. Location: WNAM (Western North America)
4. Click "Create Bucket"
```

#### Step 1.2: Create API Token
```bash
# Via Cloudflare Dashboard
1. Go to R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Token Name: sparkstage-us-upload
4. Permissions: Object Read & Write
5. Apply to specific buckets: sparkstage-us-assets
6. Click "Create API Token"
7. Copy: Access Key ID + Secret Access Key
```

#### Step 1.3: Setup Custom Domain (Optional but Recommended)
```bash
# Via Cloudflare Dashboard
1. Go to R2 → sparkstage-us-assets → Settings → Public Access
2. Click "Connect Domain"
3. Domain: cdn-us.sparkstage55.com
4. Wait for SSL (1-5 minutes)
5. Test: https://cdn-us.sparkstage55.com/test.txt
```

#### Step 1.4: Update `.env.local`
```bash
# Update with actual values from steps above
R2_ENDPOINT=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<FROM_STEP_1.2>
R2_SECRET_ACCESS_KEY=<FROM_STEP_1.2>
R2_BUCKET_NAME=sparkstage-us-assets
R2_PUBLIC_URL=https://cdn-us.sparkstage55.com
```

### Phase 2: Remove ImageKit Dependencies (20 minutes)

#### Step 2.1: Remove ImageKit Functions
```bash
# Delete these Edge Functions
supabase/functions/imagekit-auth/
supabase/functions/imagekit-delete/
```

#### Step 2.2: Remove ImageKit Frontend Code
```bash
# Delete these files
frontend/src/lib/imagekit.ts
frontend/src/lib/publicImagekitUpload.ts
frontend/src/lib/publicImagekitDelete.ts
```

#### Step 2.3: Update Image Upload Utility
File: `frontend/src/utils/uploadProductImage.ts`

**Current:** Uses ImageKit SDK  
**New:** Uses `r2-upload-url` Edge Function

**Implementation:**
```typescript
// Upload flow for R2
async function uploadToR2(file: File, productId: number) {
  // 1. Get presigned URL from Edge Function
  const { data, error } = await supabase.functions.invoke('r2-upload-url', {
    body: {
      fileName: file.name,
      fileType: file.type,
      productId
    }
  })
  
  if (error) throw error
  
  // 2. Upload directly to R2
  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  })
  
  if (!uploadResponse.ok) throw new Error('Upload failed')
  
  // 3. Return public URL for database
  return data.publicUrl
}
```

#### Step 2.4: Simplify Image Display
**Current:** Uses ImageKit transformation URLs  
**New:** Use plain R2 URLs with responsive images

```typescript
// Before (ImageKit)
<img src={buildImageKitThumbUrl(product.image, { width: 480 })} />

// After (R2 + native responsive images)
<img 
  src={product.image}
  srcset={`${product.image}?w=480 480w, ${product.image}?w=800 800w`}
  sizes="(max-width: 768px) 480px, 800px"
/>
```

**Alternative:** Use `<picture>` for more control:
```typescript
<picture>
  <source srcSet={`${product.image}?w=800`} media="(min-width: 768px)" />
  <img src={`${product.image}?w=480`} alt={product.name} />
</picture>
```

### Phase 3: Update Admin Upload UI (30 minutes)

#### Step 3.1: Update Product Image Upload
File: `frontend/src/pages/admin/RetailProducts.tsx`

**Changes:**
- Remove ImageKit auth calls
- Use new R2 upload utility
- Simplify progress tracking (no ImageKit SDK events)

#### Step 3.2: Update Dressing Room Upload
File: `frontend/src/utils/uploadDressingRoomImage.ts`

**Changes:**
- Create similar presigned URL flow for public assets
- Folder structure: `public/dressing-room/{uuid}.png`

### Phase 4: Testing (20 minutes)

```bash
# 1. Start dev server
npm run dev

# 2. Test product image upload
- Go to /admin/retail-products
- Create new product
- Upload image
- Verify image appears

# 3. Test image display
- Go to /shop
- Verify all product images load
- Check browser network tab (should show R2 domain)

# 4. Test performance
- Open DevTools > Network
- Check image load times
- Verify CDN caching (status 304 on refresh)
```

---

## 📊 Migration Comparison

| Feature | ImageKit | R2 + Custom Domain |
|---------|----------|-------------------|
| **Storage** | ~200 MB | ~200 MB |
| **Egress** | $0.36/GB | $0 (with custom domain) |
| **Transform** | Built-in API | Native responsive images |
| **SDK** | Required | Not required |
| **Auth** | API keys + tokens | Presigned URLs |
| **Setup** | Complex | Simple |
| **Vendor Lock** | Yes | No (S3-compatible) |

**Annual Cost Savings:** $500 - 2,000 USD

---

## 🚀 Quick Start

### Option A: Keep It Simple (Recommended for US Launch)

1. ✅ Setup R2 bucket + custom domain (30 min)
2. ✅ Update `.env.local` with R2 credentials
3. ✅ Replace upload utility to use `r2-upload-url`
4. ✅ Remove ImageKit SDK from package.json
5. ✅ Use plain R2 URLs (no transformations)
6. ✅ Test upload + display
7. ✅ Deploy

**Total Time:** ~2 hours

### Option B: Full Migration (If You Want Image Optimization)

Do Option A + add Cloudflare Images for transformations:
- Cloudflare Images: $5/month for 100K variants
- Supports on-the-fly resizing, WebP conversion
- Integrates with R2

**Total Time:** ~4 hours

---

## 📝 Current Status

### Environment Config: ✅ READY
- [x] Service role key added
- [x] CORS origins configured
- [x] R2 variables structure ready
- [ ] Need actual R2 credentials (waiting for bucket creation)

### Code Status: 🔄 NEEDS MIGRATION
- [x] R2 upload Edge Function exists
- [ ] Remove ImageKit Edge Functions
- [ ] Remove ImageKit frontend code
- [ ] Update upload utilities
- [ ] Update admin UI

### Infrastructure: ⏸️ WAITING
- [ ] Create US R2 bucket
- [ ] Generate API token
- [ ] Setup custom domain
- [ ] Configure DNS

---

## 🎯 Recommended Action Plan

### Today (2 hours):
1. Create R2 bucket: `sparkstage-us-assets`
2. Generate R2 API token (Read & Write)
3. Update `.env.local` with real credentials
4. Test `r2-upload-url` function with curl

### Tomorrow (3 hours):
1. Setup custom domain: `cdn-us.sparkstage55.com`
2. Remove ImageKit dependencies
3. Update upload utility
4. Test end-to-end upload flow

### Day 3 (2 hours):
1. Update all image display components
2. Remove ImageKit SDK from package.json
3. Clean up unused code
4. Documentation

**Total Estimate:** ~7 hours to complete R2 migration

---

## 📚 Reference

### Documentation:
- R2 Upload Function: `supabase/functions/r2-upload-url/index.ts`
- Indonesia R2 Status: `R2_MIGRATION_COMPLETE_SUMMARY.md`
- Custom Domain Guide: `docs/runbooks/R2_US_CUSTOM_DOMAIN_SETUP.md`

### Cloudflare Docs:
- R2 Overview: https://developers.cloudflare.com/r2/
- R2 API: https://developers.cloudflare.com/r2/api/s3/
- Presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/

### Test Commands:
```bash
# Test R2 upload function locally
curl -X POST http://localhost:54321/functions/v1/r2-upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "fileType": "image/jpeg",
    "productId": 1
  }'
```

---

**Next Step:** Create R2 bucket and get credentials! 🚀
