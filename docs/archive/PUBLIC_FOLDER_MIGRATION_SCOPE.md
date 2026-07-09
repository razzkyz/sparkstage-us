# ImageKit /public/ Folder Migration - Scope Analysis

**Date**: June 9, 2026  
**Status**: 📋 SCOPE DETERMINATION NEEDED

---

## Pertanyaan User

> "jadi yang di public ada buat banner juga"

Translation: "So in /public/ there are banners too"

---

## Current Situation

### ✅ What's Already Migrated to R2

**Folder**: `/products/`  
**Source**: ImageKit → R2  
**Status**: ✅ **100% COMPLETE** (2,227 images)  
**Database table**: `product_images`  
**Purpose**: Product catalog images (pakaian, aksesoris, dll)

### ❓ What's NOT Yet Migrated

**Folder**: `/public/`  
**Source**: ImageKit (mirrored from Supabase Storage)  
**Status**: ⚠️ **NOT MIGRATED YET**  
**Database tables**: Multiple tables (see below)  
**Purpose**: Banner, beauty posters, glam page images, dressing room photos

---

## ImageKit `/public/` Folder Contents

Based on the previous Supabase → ImageKit cutover script (`imagekit_public_asset_url_cutover.sql`), the `/public/` folder contains:

### 1. **Banners** 🎨
- **Table**: `public.banners`
- **Columns**: 
  - `image_url` - Banner main image
  - `title_image_url` - Banner title image
- **ImageKit path**: `/public/banners/`
- **Purpose**: Homepage banners, promotional images
- **Example URL**: `https://ik.imagekit.io/hjnuyz1t3/public/banners/banner-1.jpg`

### 2. **Beauty Posters** 💄
- **Table**: `public.beauty_posters`
- **Columns**: 
  - `image_url` - Beauty poster image
- **ImageKit path**: `/public/beauty/posters/`
- **Purpose**: Beauty section promotional posters
- **Example URL**: `https://ik.imagekit.io/hjnuyz1t3/public/beauty/posters/poster-1.jpg`

### 3. **Glam Page Settings** ✨
- **Table**: `public.glam_page_settings`
- **Columns**: 
  - `hero_image_url` - Glam page hero image
  - `look_model_image_url` - Look model image
  - `look_star_links` - JSONB array with `image_url` fields
- **ImageKit path**: `/public/beauty/glam/`
- **Purpose**: Glam page hero, model images, star links
- **Example URL**: `https://ik.imagekit.io/hjnuyz1t3/public/beauty/glam/hero.jpg`

### 4. **Dressing Room Photos** 📸
- **Table**: `public.dressing_room_look_photos`
- **Columns**: 
  - `image_url` - Dressing room look photo
- **ImageKit path**: `/public/dressing-room/`
- **Purpose**: User-uploaded dressing room photos
- **Example URL**: `https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/123/photo.jpg`

---

## Migration Scope Options

### Option 1: Products Only (CURRENT PLAN)
- ✅ Migrate `/products/` folder → R2 (DONE)
- ❌ Keep `/public/` folder in ImageKit (NO CHANGE)
- 📊 Database cutover: `product_images` table only
- 💰 Savings: Partial ($0.20 per 1,000 requests) - only product images
- ⚠️ Risk: Low - banners still served from ImageKit

**Pros**:
- Faster migration (already complete)
- Lower risk (smaller scope)
- Banner/public assets remain stable

**Cons**:
- Still paying ImageKit for `/public/` folder
- Mixed hosting (R2 + ImageKit)

### Option 2: Products + Public Assets (COMPLETE MIGRATION)
- ✅ Migrate `/products/` folder → R2 (DONE)
- 🔄 Migrate `/public/` folder → R2 (TODO)
- 📊 Database cutover: `product_images` + 4 banner/public tables
- 💰 Savings: Complete ($0.20 per 1,000 requests + storage)
- ⚠️ Risk: Medium - more tables affected

**Pros**:
- Complete ImageKit exit
- Maximum cost savings
- Single CDN (R2 only)

**Cons**:
- Requires additional migration work
- More tables to update (5 tables total)
- Higher complexity

---

## R2 Bucket Structure

### Current (Option 1 - Products Only):
```
sparkstage-public-assets/
└── products/
    ├── 27/
    ├── 32/
    ├── 34/
    └── ...
    (2,227 images)
```

### Proposed (Option 2 - Complete):
```
sparkstage-public-assets/
├── products/         ← Already uploaded ✅
│   ├── 27/
│   ├── 32/
│   └── ...
└── public/           ← Needs migration 🔄
    ├── banners/
    ├── beauty/
    │   ├── posters/
    │   └── glam/
    └── dressing-room/
```

---

## Next Steps to Determine Scope

### Step 1: Count Images in Each Category

Run this query to see how many banner/public URLs exist:

```sql
-- Count banners
SELECT COUNT(*) as count FROM public.banners 
WHERE image_url LIKE '%imagekit.io%' 
   OR title_image_url LIKE '%imagekit.io%';

-- Count beauty posters
SELECT COUNT(*) as count FROM public.beauty_posters 
WHERE image_url LIKE '%imagekit.io%';

-- Count glam page images
SELECT COUNT(*) as count FROM public.glam_page_settings
WHERE hero_image_url LIKE '%imagekit.io%'
   OR look_model_image_url LIKE '%imagekit.io%'
   OR look_star_links::text LIKE '%imagekit.io%';

-- Count dressing room photos
SELECT COUNT(*) as count FROM public.dressing_room_look_photos 
WHERE image_url LIKE '%imagekit.io%';
```

### Step 2: Check ImageKit Dashboard

1. Login to ImageKit: https://imagekit.io/dashboard
2. Navigate to **Media Library**
3. Go to `/public/` folder
4. Count total files in:
   - `/public/banners/`
   - `/public/beauty/`
   - `/public/dressing-room/`
5. Note total size and file count

### Step 3: Decision Matrix

| Factor | Products Only | Complete Migration |
|--------|---------------|-------------------|
| Images to migrate | 0 (done) | ~50-200? (estimate) |
| Tables to update | 1 table | 5 tables |
| Migration time | 0 mins | ~10-30 mins |
| Risk level | Low | Medium |
| Cost savings | Partial | Complete |
| Maintenance | Mixed CDN | Single CDN |

---

## Questions for User

1. **Berapa banyak banner images yang ada di ImageKit `/public/` folder?**
   - Check ImageKit dashboard → Media Library → /public/

2. **Apakah banner/public images sering diupdate?**
   - If yes → Maybe keep in ImageKit for easier updates
   - If no → Migrate to R2 for cost savings

3. **Berapa besar file size total di `/public/` folder?**
   - Small (<100MB) → Easy to migrate
   - Large (>1GB) → Consider carefully

4. **Prioritas: Cost savings vs simplicity?**
   - Cost savings → Do complete migration (Option 2)
   - Simplicity → Stick to products only (Option 1)

---

## Recommendation

**Saran saya**: **Option 1 (Products Only)** dulu

**Alasan**:
1. ✅ Product images (2,227) sudah di R2
2. ✅ Cutover database lebih simple (1 table)
3. ✅ Risk lebih rendah
4. ✅ Banner/public assets biasanya jarang diakses (vs product images)
5. ✅ Bisa migrate `/public/` nanti kalau perlu (Phase 2)

**Phase 1**: Migrate products only (DONE)  
**Phase 2**: Evaluate `/public/` folder usage → Migrate later if needed

---

## Files to Check

### To understand banner usage:
1. `supabase/manual/imagekit_public_asset_url_cutover.sql` ✅ (shows which tables use banners)
2. `frontend/src/pages/Home.tsx` - Check if banners are used
3. `frontend/src/pages/Beauty.tsx` - Check beauty posters usage
4. `frontend/src/pages/DressingRoom.tsx` - Check dressing room photos

### To run migration if needed:
1. Create `scripts/migrate-imagekit-public-to-r2.mjs` (similar to products script)
2. Create `scripts/cutover-public-assets-to-r2.sql` (similar to products cutover)
3. Update `.env.r2-migration` with public folder config

---

## Cost Comparison

### ImageKit (Current):
- Storage: $0 (free tier up to 20GB)
- Bandwidth: $0.20 per 1,000 requests
- **Estimated**: ~$5-10/month for all images

### Cloudflare R2 (After Migration):
- Storage: $0.015 per GB/month
- Bandwidth: **$0 (FREE)** via custom domain
- **Estimated**: ~$1-2/month for storage only

**Potential Savings**: $3-8/month (~$36-96/year)

---

## Status

⏸️ **WAITING FOR USER DECISION**:
- [ ] User checks ImageKit dashboard for `/public/` folder size
- [ ] User decides: Products only (Option 1) OR Complete migration (Option 2)
- [ ] User confirms if banner/public images are critical
- [ ] User approves database cutover scope

**Next Action**: User to check ImageKit `/public/` folder and decide scope

---

**Note**: Product images migration is 100% complete and ready for cutover. The `/public/` folder decision is separate and can be done later if needed.
