# 🚀 R2 Setup Quick Start - SparkStage US

**Panduan Singkat:** Setup Cloudflare R2 untuk hosting gambar produk  
**Waktu:** ~30 menit  
**Biaya:** $0 💰

---

## 📋 Yang Sudah Siap ✅

1. ✅ **Edge Function:** `supabase/functions/r2-upload-url/` sudah ada
2. ✅ **Environment:** `.env.local` sudah dikonfigurasi
3. ✅ **Service Role Key:** Sudah dimasukkan
4. ✅ **CORS:** Sudah diconfig untuk localhost:5174

**Yang kurang:** R2 bucket dan API credentials

---

## 🎯 Langkah-Langkah Setup

### 1️⃣ Buat R2 Bucket (5 menit)

**Login ke Cloudflare Dashboard:**
```
https://dash.cloudflare.com/
```

**Buat bucket baru:**
1. Klik **R2** di sidebar kiri
2. Klik **Create bucket**
3. Isi form:
   - **Bucket name:** `sparkstage-us-assets`
   - **Location:** **Western North America (WNAM)**
4. Klik **Create bucket**

✅ **Berhasil!** Bucket sudah dibuat.

---

### 2️⃣ Buat API Token (5 menit)

**Di dashboard R2:**
1. Klik **Manage R2 API Tokens** (kanan atas)
2. Klik **Create API token**
3. Isi form:
   - **Token name:** `sparkstage-us-upload`
   - **Permissions:** ✅ **Object Read & Write**
   - **Specify bucket(s):** ✅ Pilih `sparkstage-us-assets`
   - **TTL:** Leave blank (no expiry)
4. Klik **Create API Token**

**⚠️ PENTING:** Copy credentials ini sekarang (tidak bisa dilihat lagi):
- ✅ **Access Key ID:** `xxxxxxxxxxxxx`
- ✅ **Secret Access Key:** `yyyyyyyyyyyy`
- ✅ **Account ID:** (tampil di atas token)

---

### 3️⃣ Update `.env.local` (2 menit)

**Buka file:** `c:\SparkDoku\sparkstageus\.env.local`

**Replace bagian R2 dengan credentials dari step 2:**

```bash
# ============================================
# Cloudflare R2 Configuration (Image Storage)
# ============================================

# R2 Endpoint (ganti <ACCOUNT_ID> dengan Account ID Anda)
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# R2 Credentials (dari step 2)
R2_ACCOUNT_ID=<ACCOUNT_ID dari step 2>
R2_ACCESS_KEY_ID=<Access Key ID dari step 2>
R2_SECRET_ACCESS_KEY=<Secret Access Key dari step 2>

# R2 Bucket Configuration
R2_BUCKET_NAME=sparkstage-us-assets
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
```

**Cara dapat R2_PUBLIC_URL:**
1. Buka Cloudflare Dashboard → R2
2. Klik bucket `sparkstage-us-assets`
3. Tab **Settings** → **Public access**
4. Enable public access
5. Copy **R2.dev subdomain**

---

### 4️⃣ (Opsional) Setup Custom Domain (10 menit)

**Kenapa custom domain?**
- ✅ Zero egress cost (gratis bandwidth)
- ✅ Professional: `cdn-us.sparkstage55.com`
- ✅ Faster dengan Cloudflare CDN

**Setup:**
1. Di bucket settings → **Public access**
2. Klik **Connect Domain**
3. Pilih domain: **sparkstage55.com**
4. Subdomain: **cdn-us**
5. Klik **Connect domain**
6. Tunggu SSL provision (~2-5 menit)

**Update `.env.local`:**
```bash
R2_PUBLIC_URL=https://cdn-us.sparkstage55.com
```

---

### 5️⃣ Test Upload (5 menit)

**Terminal 1 - Start Edge Functions:**
```bash
npm run supabase:functions:serve
```

**Terminal 2 - Test upload:**
```bash
# Get auth token first
# Login di browser: http://localhost:5174
# Copy token dari browser DevTools > Application > Local Storage

# Test R2 upload endpoint
curl -X POST http://localhost:54321/functions/v1/r2-upload-url \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"test.jpg\",\"fileType\":\"image/jpeg\",\"productId\":1}"
```

**Response sukses:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...presigned-url...",
    "publicUrl": "https://cdn-us.sparkstage55.com/products/1/xxxxx.jpg",
    "key": "products/1/xxxxx.jpg",
    "fileName": "xxxxx.jpg"
  }
}
```

✅ **Berhasil!** R2 sudah siap dipakai.

---

## 🎯 Langkah Berikutnya

### Immediate (Sekarang):
- ✅ R2 setup complete
- ✅ Test upload sukses
- ⏸️ **Next:** Migrate upload code dari ImageKit ke R2

### Tomorrow (2-3 jam):
1. Hapus ImageKit dependencies
2. Update `uploadProductImage.ts` untuk pakai R2
3. Test admin product upload
4. Deploy

**Guide lengkap:** `R2_MIGRATION_US_VERSION.md`

---

## 📊 Cost Comparison

| Storage | Indonesia (ImageKit) | US (R2) |
|---------|---------------------|---------|
| **Storage cost** | Rp 50K/month | $0 |
| **Egress** | Rp 42K - 192K/month | $0 (custom domain) |
| **SDK** | Required | Not needed |
| **Total/year** | Rp 504K - 2.3M | **$0** ✅ |

**Hemat:** Rp 500K - 2.3 juta per tahun! 💰

---

## 🐛 Troubleshooting

### Error: "Access Denied"
- ✅ Check API token permissions: Must have **Object Read & Write**
- ✅ Check bucket name di `.env.local`: Must be `sparkstage-us-assets`

### Error: "Invalid credentials"
- ✅ Check `R2_ACCESS_KEY_ID` dan `R2_SECRET_ACCESS_KEY`
- ✅ Check `R2_ACCOUNT_ID`
- ✅ Restart Edge Functions setelah update `.env.local`

### Images tidak muncul
- ✅ Check `R2_PUBLIC_URL` di `.env.local`
- ✅ Pastikan public access enabled di bucket settings
- ✅ Test URL manual di browser: `https://cdn-us.sparkstage55.com/test.txt`

---

## ✅ Checklist

Setup R2:
- [ ] Buat R2 bucket: `sparkstage-us-assets`
- [ ] Generate API token (Read & Write)
- [ ] Copy Access Key ID + Secret Key
- [ ] Update `.env.local` dengan credentials
- [ ] (Opsional) Setup custom domain
- [ ] Test upload dengan curl

Code Migration (Next):
- [ ] Remove ImageKit code
- [ ] Update upload utility
- [ ] Test admin upload
- [ ] Deploy

---

## 📞 Quick Reference

**Cloudflare Dashboard:**
- R2: https://dash.cloudflare.com/ → R2
- DNS: https://dash.cloudflare.com/ → Websites → sparkstage55.com → DNS

**Local Commands:**
```bash
# Start dev server
npm run dev

# Start Edge Functions
npm run supabase:functions:serve

# Check environment
cat .env.local | grep R2
```

**Files:**
- Environment: `.env.local`
- Edge Function: `supabase/functions/r2-upload-url/index.ts`
- Upload utility: `frontend/src/utils/uploadProductImage.ts`

---

**Status:** 🎯 Ready to complete!  
**Next:** Run through steps 1-5 above (~30 minutes)  
**Result:** Zero-cost image hosting ✅

🚀 **Mari setup R2 sekarang!**
