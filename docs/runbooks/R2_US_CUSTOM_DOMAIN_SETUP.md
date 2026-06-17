# Setup Custom Domain for R2 US Bucket

**Date:** 2026-06-13  
**Purpose:** Setup `cdn.sparkstage-us.com` for zero-cost egress from R2 bucket

---

## 📋 Prerequisites

1. **Domain:** Own a domain (e.g., `sparkstage-us.com` or use subdomain from existing domain)
2. **Cloudflare Account:** Same account as R2 bucket
3. **R2 Bucket:** `sparkstage-us-assets` (already created ✅)

---

## 🚀 Step-by-Step Setup

### **Step 1: Add Custom Domain to R2 Bucket**

1. **Open Cloudflare Dashboard:**
   - Go to: https://dash.cloudflare.com
   - Navigate to: **R2** → **sparkstage-us-assets**

2. **Click "Settings" tab**

3. **Scroll to "Public Access" section**

4. **Click "Connect Domain"**

5. **Enter Domain:**
   ```
   cdn.sparkstage-us.com
   ```

6. **Click "Continue"**

7. **Cloudflare will show DNS records to add** (usually CNAME)

---

### **Step 2: Add DNS Records**

Cloudflare will provide DNS records like this:

#### **Option A: If domain is on Cloudflare** (Recommended)

DNS records will be **automatically added** ✅

Just confirm and wait 1-2 minutes for propagation.

#### **Option B: If domain is NOT on Cloudflare**

You need to manually add CNAME record to your DNS provider:

**Example DNS Record:**
```
Type:   CNAME
Name:   cdn.sparkstage-us.com
Target: sparkstage-us-assets.58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
TTL:    Auto (or 3600)
Proxy:  Yes (orange cloud)
```

---

### **Step 3: Verify Domain**

1. **Wait 1-5 minutes** for DNS propagation

2. **Test domain:**
   ```bash
   # Windows (CMD or PowerShell)
   curl https://cdn.sparkstage-us.com/products/test.png
   
   # Or open in browser
   https://cdn.sparkstage-us.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png
   ```

3. **Expected Result:**
   - ✅ Image loads successfully
   - ✅ Status: 200 OK
   - ✅ No SSL errors

---

### **Step 4: Enable Public Access (if needed)**

If domain doesn't work, check public access:

1. Go to: R2 → **sparkstage-us-assets** → **Settings**
2. Find: **"Public Access"**
3. Make sure: **"Allow Access"** is enabled ✅
4. Domain should be listed under **"Custom Domains"**

---

## 🌐 Alternative: Use R2.dev Subdomain (Temporary)

If you don't want custom domain yet, use R2.dev:

1. Go to: R2 → **sparkstage-us-assets** → **Settings**
2. Click: **"Allow Access"** under Public Access
3. Cloudflare will give you a URL like:
   ```
   https://pub-xxxxx.r2.dev
   ```
4. Use this URL for now (but has egress costs!)

---

## 💡 Why Custom Domain?

| Feature | R2.dev Domain | Custom Domain |
|---------|---------------|---------------|
| **Egress Cost** | ❌ $0.36/GB | ✅ **FREE** (zero-cost) |
| **SSL** | ✅ Free | ✅ Free |
| **Branding** | ❌ Generic | ✅ Your brand |
| **Cache** | ✅ Yes | ✅ Yes |
| **Speed** | ✅ Fast | ✅ Fast |

**Custom domain = Zero egress costs!** 💰

---

## 🔧 DNS Configuration Examples

### **Example 1: Using Subdomain from Existing Domain**

If you own `sparkstage.com`:

**DNS Record:**
```
Type:   CNAME
Name:   cdn-us (or cdn.sparkstage-us)
Target: sparkstage-us-assets.58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
Result: cdn-us.sparkstage.com
```

### **Example 2: Using New Domain**

If you buy `sparkstage-us.com`:

**DNS Record:**
```
Type:   CNAME
Name:   cdn
Target: sparkstage-us-assets.58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
Result: cdn.sparkstage-us.com
```

### **Example 3: Using Root Domain**

**Not recommended** - Use subdomain instead (cdn, assets, img, etc.)

---

## 🧪 Testing Custom Domain

### **Test 1: DNS Resolution**

```bash
# Windows
nslookup cdn.sparkstage-us.com

# Should return Cloudflare IPs
```

### **Test 2: File Access**

```bash
# Test with sample file
curl -I https://cdn.sparkstage-us.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png

# Expected response:
# HTTP/2 200
# content-type: image/png
# cache-control: public, max-age=14400
```

### **Test 3: Browser**

Open in browser:
```
https://cdn.sparkstage-us.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png
```

Should show product image ✅

---

## 🎯 After Domain is Active

### **Update Database URLs**

Once domain works, update sample data migration:

**File:** `supabase/migrations/20260613000002_add_sample_data.sql`

**Change URLs from:**
```sql
'https://images.unsplash.com/photo-...'
```

**To:**
```sql
'https://cdn.sparkstage-us.com/products/...'
```

### **Update .env.local**

Add custom domain to environment:

```bash
# .env.local
VITE_CDN_BASE_URL=https://cdn.sparkstage-us.com
```

### **Update Frontend Code**

If needed, update image helper to use custom domain:

**File:** `frontend/src/lib/imageHelpers.ts` (if exists)

```typescript
export const getCDNUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_CDN_BASE_URL || 'https://cdn.sparkstage-us.com';
  return `${baseUrl}/${path}`;
};
```

---

## ⚠️ Troubleshooting

### **Issue: Domain not resolving**

**Solution:**
1. Wait 5-10 minutes for DNS propagation
2. Clear DNS cache: `ipconfig /flushdns` (Windows)
3. Check DNS record is correct

### **Issue: 403 Forbidden**

**Solution:**
1. Check R2 bucket public access is enabled
2. Verify domain is added to R2 custom domains
3. Check file exists in bucket

### **Issue: SSL certificate error**

**Solution:**
1. Wait for Cloudflare to provision SSL (1-5 minutes)
2. Make sure proxy is enabled (orange cloud)
3. Check domain is on Cloudflare

### **Issue: Images not loading**

**Solution:**
1. Verify files are copied to bucket (use R2 dashboard)
2. Check file paths match database URLs
3. Test with direct R2.dev URL first

---

## 📚 Resources

- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **Custom Domains:** https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains
- **Zero Egress:** https://blog.cloudflare.com/r2-egress/

---

## ✅ Success Checklist

- [ ] Custom domain added to R2 bucket
- [ ] DNS records configured
- [ ] Domain resolves correctly
- [ ] Test image loads via custom domain
- [ ] Public access enabled
- [ ] SSL certificate active
- [ ] Zero-cost egress confirmed

---

## 🎉 Next Steps

After custom domain is active:

1. **Update database sample data** with real R2 URLs
2. **Push database migration** to apply new URLs
3. **Test frontend** - verify images load
4. **Update documentation** with new CDN URL

---

**Estimated Setup Time:** 5-10 minutes (mostly DNS propagation wait time)

**Cost:** $0 (zero egress with custom domain!) 💰

