# ✅ R2 Setup Complete - Quick Start Guide

**After copy finishes, follow these steps to complete setup**

---

## 🎯 Prerequisites Check

Before starting, verify:
- ✅ Copy script finished (2,230 files copied)
- ✅ No errors in terminal output
- ✅ R2 bucket `sparkstage-us-assets` has files

---

## 📋 Step-by-Step Setup (5-10 minutes)

### **Step 1: Verify Copy Success** (1 min)

Check terminal output:

```bash
# Via Kiro
get_process_output terminalId=2 lines=50
```

**Expected output:**
```
🎉 Copy Complete!
✅ Copied: 2,230 files
⏱️  Duration: ~20-30 minutes
```

**Verify in R2 Dashboard:**
1. Open: https://dash.cloudflare.com
2. Go to: R2 → `sparkstage-us-assets`
3. Browse: `products/` folder
4. Should see folders: `1000/`, `1001/`, ... `2999/`

---

### **Step 2: Setup Custom Domain** (5 min)

#### **Option A: Use Subdomain from Existing Domain** ⭐ (Recommended)

If you own `sparkstage.com` or any domain on Cloudflare:

**2.1. Add Custom Domain to R2:**
1. Open: R2 → `sparkstage-us-assets` → **Settings**
2. Scroll to: **Public Access** section
3. Click: **"Connect Domain"**
4. Enter domain name:
   - **Option 1:** `cdn-us.sparkstage.com` (subdomain from Indonesia domain)
   - **Option 2:** `cdn.sparkstage-us.com` (if you have separate US domain)
   - **Option 3:** `assets-us.sparkstage.com` (alternative)
5. Click: **"Continue"**
6. **DNS auto-configured** ✅ (if domain on Cloudflare)

**2.2. Wait for SSL:**
- SSL certificate: 1-5 minutes ⏱️
- Check status: Green checkmark on domain

**2.3. Test Domain:**
```bash
# Test with actual copied file
curl -I https://cdn-us.sparkstage.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png

# Expected: HTTP/2 200
```

#### **Option B: Use R2.dev Domain** (Temporary - has egress costs)

If you don't want custom domain yet:

1. Open: R2 → `sparkstage-us-assets` → **Settings**
2. Under **Public Access**, click: **"Allow Access"**
3. Copy the R2.dev URL provided:
   ```
   https://pub-xxxxxxxxx.r2.dev
   ```
4. Use this for now (⚠️ but has egress costs)

**⚠️ Note:** R2.dev has egress costs. Use custom domain for zero-cost egress!

---

### **Step 3: Update Sample Data URLs** (2 min)

**File to edit:** `supabase/migrations/20260613000002_add_sample_data.sql`

#### **3.1. Find-Replace URLs:**

**Find:**
```
https://images.unsplash.com/
```

**Replace with:**
```
https://cdn-us.sparkstage.com/products/
```

**Example:**

**OLD (Unsplash):**
```sql
INSERT INTO public.product_images (product_id, image_url, display_order) VALUES
(1, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500', 1);
```

**NEW (R2):**
```sql
INSERT INTO public.product_images (product_id, image_url, display_order) VALUES
(1, 'https://cdn-us.sparkstage.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png', 1);
```

#### **3.2. Or Use Real Product Data:**

Better option: Import real product data from Indonesia database:

```sql
-- Export from Indonesia DB
SELECT * FROM products;
SELECT * FROM product_variants;
SELECT * FROM product_images;

-- Update image URLs
UPDATE product_images 
SET image_url = REPLACE(image_url, 'cdn.sparkstage55.com', 'cdn-us.sparkstage.com');

-- Import to US DB
-- (Copy the data)
```

---

### **Step 4: Push Database Changes** (1 min)

```bash
cd C:\SparkDoku\sparkstageus

# Push migrations
npm run supabase:db:push
```

**Expected output:**
```
✅ Migration applied: 20260613000002_add_sample_data.sql
✅ Migration applied: 20260613000003_update_to_r2_urls.sql (if used)
```

---

### **Step 5: Update .env.local** (1 min)

Add CDN URL to environment:

```bash
# File: .env.local

# Add this line at the end:
VITE_CDN_BASE_URL=https://cdn-us.sparkstage.com
```

---

### **Step 6: Test Frontend** (2 min)

```bash
cd C:\SparkDoku\sparkstageus

# Start development server
npm run dev
```

**Open browser:**
```
http://localhost:5174
```

**Expected:**
- ✅ Shop page loads
- ✅ Product images load from `cdn-us.sparkstage.com`
- ✅ No broken images
- ✅ Fast loading (CDN cached)

**Check Network tab (F12):**
- Images should load from: `cdn-us.sparkstage.com`
- Status: 200 OK
- Cache: `cf-cache-status: HIT` (after first load)

---

## 🎉 Success Checklist

After completing all steps, verify:

- [ ] ✅ 2,230 files copied to R2 bucket
- [ ] ✅ Custom domain setup and working
- [ ] ✅ SSL certificate active (green lock in browser)
- [ ] ✅ Test image loads successfully
- [ ] ✅ Database URLs updated
- [ ] ✅ Migrations pushed to database
- [ ] ✅ Frontend loads with R2 images
- [ ] ✅ No console errors in browser
- [ ] ✅ Images load fast (CDN cached)

---

## 📊 Final Result

### **What You Have Now:**

| Component | Status | Details |
|-----------|--------|---------|
| **R2 Bucket** | ✅ Active | `sparkstage-us-assets` (WNAM) |
| **Files** | ✅ 2,230 | All product images copied |
| **Custom Domain** | ✅ Active | `cdn-us.sparkstage.com` |
| **SSL** | ✅ Active | Free Cloudflare SSL |
| **Egress Cost** | ✅ $0 | Zero-cost with custom domain |
| **Database** | ✅ Updated | URLs point to R2 |
| **Frontend** | ✅ Working | Images load from CDN |

### **Benefits:**

- 🚀 **Fast:** CDN-cached images worldwide
- 💰 **Free:** Zero egress costs with custom domain
- 🔒 **Secure:** Free SSL certificate
- 🌍 **Global:** Cloudflare's global network
- 📈 **Scalable:** No bandwidth limits
- 🇺🇸 **US-Optimized:** WNAM region for US users

---

## 🔧 Troubleshooting

### **Issue: Custom domain not working**

**Symptoms:** Domain doesn't resolve or shows 404

**Solution:**
1. Check DNS: `nslookup cdn-us.sparkstage.com`
2. Wait 5-10 minutes for DNS propagation
3. Flush DNS: `ipconfig /flushdns`
4. Verify domain added in R2 settings

### **Issue: Images show 403 Forbidden**

**Symptoms:** Images return 403 error

**Solution:**
1. Check R2 bucket public access is enabled
2. Verify domain is listed in custom domains
3. Check file exists in bucket (use R2 dashboard)

### **Issue: SSL certificate error**

**Symptoms:** Browser shows "Not Secure" or certificate warning

**Solution:**
1. Wait 5 minutes for SSL provisioning
2. Check domain proxy is enabled (orange cloud in DNS)
3. Clear browser cache
4. Try incognito/private window

### **Issue: Images not loading in frontend**

**Symptoms:** Broken image icons in shop

**Solution:**
1. Check browser console (F12) for errors
2. Verify URLs in database match R2 structure
3. Test direct image URL in browser
4. Check CORS settings (usually not needed for public buckets)

---

## 📚 Documentation Reference

- **Copy Guide:** `docs/runbooks/R2_COPY_INDO_TO_US.md`
- **Domain Setup:** `docs/runbooks/R2_US_CUSTOM_DOMAIN_SETUP.md`
- **Indonesia R2 Setup:** See `sparkstage` repo for reference

---

## 🎯 Optional: Next Steps

### **1. Optimize Images**

Consider image optimization for faster loading:
- Use WebP format where supported
- Implement lazy loading
- Add responsive images (srcset)

### **2. Setup Image Upload**

For admin to upload new products:
- Create R2 upload Edge Function
- Add image upload UI in admin panel
- See Indonesia version for reference

### **3. Add Image Variants**

Generate thumbnails and different sizes:
- Original: 1200x1200
- Thumbnail: 300x300
- Medium: 600x600

### **4. Monitor Usage**

Keep track of R2 usage:
- Check R2 dashboard regularly
- Monitor storage size
- Track request counts

---

## 💡 Tips

1. **Custom Domain = Free Egress:** Always use custom domain for zero costs
2. **CDN Caching:** Images cached at edge = faster loading
3. **Global Performance:** Cloudflare serves from nearest location
4. **SSL Included:** Free SSL certificate, no extra setup
5. **Backup Strategy:** Keep Indonesia bucket as backup

---

## 🎉 You're Done!

Your SparkStage US version now has:
- ✅ 2,230 product images on R2
- ✅ Custom CDN domain
- ✅ Zero egress costs
- ✅ Fast global delivery
- ✅ Production-ready setup

**Total Setup Time:** ~30-45 minutes (mostly automated copy)

**Cost:** $0 (zero egress with custom domain!)

---

**Next:** Build Stripe payment integration! 💳

See: `.agents/skills/sparkstage-us-builder/SKILL.md` for payment integration guide
