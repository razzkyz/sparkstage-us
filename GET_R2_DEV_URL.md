# Get R2.dev URL untuk Bucket US

**Tujuan:** Mendapatkan R2.dev URL temporary sebelum setup custom domain

---

## 🚀 Langkah-langkah:

### **Step 1: Enable Public Access**

1. Buka: https://dash.cloudflare.com
2. Navigate to: **R2** → **sparkstage-us-assets**
3. Click tab: **Settings**
4. Scroll ke: **Public Access** section
5. Click: **"Allow Access"**
6. Cloudflare akan generate R2.dev URL

### **Step 2: Copy R2.dev URL**

Setelah enable, Anda akan mendapat URL seperti:

```
https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

**Example:**
```
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev
```

Copy URL ini!

### **Step 3: Update Migration File**

Edit file: `supabase/migrations/20260613000002_add_sample_data.sql`

**Find:**
```sql
'https://pub-xxxxx.r2.dev/products/1000/...'
```

**Replace dengan R2.dev URL Anda:**
```sql
'https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/1000/...'
```

**Cara cepat (Find & Replace):**
- Find: `pub-xxxxx.r2.dev`
- Replace: `pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev` (ganti dengan URL Anda)

### **Step 4: Test URL**

Test satu image dulu:

```bash
# Ganti dengan R2.dev URL Anda
curl -I https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png

# Expected: HTTP/2 200
```

Atau buka di browser:
```
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png
```

Seharusnya gambar product muncul! ✅

---

## 📋 Alternative: Setup Custom Domain Sekarang

**Lebih baik langsung setup custom domain** untuk zero-cost egress!

### **Quick Setup:**

1. **Add Custom Domain to R2:**
   - R2 → sparkstage-us-assets → Settings
   - Click "Connect Domain"
   - Enter: `cdn-us.sparkstage.com` (atau pilih subdomain lain)
   - Confirm

2. **Wait for SSL:** 1-5 minutes

3. **Update Migration File:**
   ```sql
   -- Ganti pub-xxxxx.r2.dev dengan custom domain
   'https://cdn-us.sparkstage.com/products/1000/...'
   ```

4. **Done!** Zero egress costs ✅

---

## ⚠️ Important Notes

### **R2.dev URL:**
- ✅ Works immediately (no DNS setup)
- ❌ Has egress costs ($0.36/GB)
- ❌ Generic URL (not branded)
- ⚠️ Use only for testing

### **Custom Domain:**
- ✅ **Zero egress costs** 💰
- ✅ Branded URL (your domain)
- ✅ Better cache control
- ✅ Free SSL
- ⏱️ Need 1-5 minutes setup

**Recommendation:** Setup custom domain now, save money later!

---

## 🎯 Next Steps

After getting URL (R2.dev or custom):

1. ✅ Update migration file with correct URL
2. ✅ Push migrations: `npm run supabase:db:push`
3. ✅ Test frontend: `npm run dev`
4. ✅ Verify images load correctly

---

## 💡 Pro Tip

If you setup custom domain now:
- Change migration file directly to custom domain
- Skip R2.dev entirely
- Save money from day 1
- No need to update URLs later

**Command to update later (if you use R2.dev first):**

```sql
-- Run this in Supabase SQL Editor when custom domain ready
UPDATE product_images 
SET image_url = REPLACE(image_url, 'pub-xxxxx.r2.dev', 'cdn-us.sparkstage.com');
```

---

**Choose wisely! Custom domain = $0 egress, R2.dev = $$ costs** 💰

