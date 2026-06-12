# Enable R2 Public Access via R2.dev Domain

**Date**: June 9, 2026  
**Status**: ⚠️ REQUIRED - R2.dev public access not enabled yet

---

## Problem

R2 bucket `sparkstage-public-assets` has files uploaded but **NOT accessible** via R2.dev domain.

**Test URL (FAILS)**:
```
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
```

**Error**: Connection error / SSL error

---

## Solution: Enable Public Access in Cloudflare Dashboard

### Step 1: Login Cloudflare Dashboard

1. Buka: **https://dash.cloudflare.com**
2. Login dengan akun Cloudflare kamu

### Step 2: Navigate to R2 Bucket

1. Klik: **R2** (sidebar kiri)
2. Klik bucket: **sparkstage-public-assets**

### Step 3: Enable Public Access

1. Klik tab: **Settings** (di atas)
2. Scroll ke section: **Public Access** atau **R2.dev subdomain**
3. Cari opsi: **"Allow Public Access"** atau **"Enable R2.dev subdomain"**
4. Klik: **Enable** atau **Allow Access**
5. Confirm R2.dev domain: `pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev`
6. Klik: **Save** atau **Confirm**

### Alternative Path (if different UI):

1. Di bucket settings, cari: **"Public URL"** atau **"Domain"**
2. Enable toggle: **"Public Access"**
3. Domain akan otomatis assign: `pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev`

---

## Step 4: Test Public Access

Setelah enable, test URL ini di browser:

```
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
```

**Expected result**: Image loads ✅

**If still fails**: Tunggu 5-10 menit untuk SSL certificate provisioning

---

## Verification Commands

### Test via PowerShell:
```powershell
Invoke-WebRequest -Uri "https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png" -Method Head
```

**Expected output**: `StatusCode: 200`

### Test via Browser:
Just open the URL directly in Chrome/Firefox.

---

## Important Notes

### 1. R2.dev vs Custom Domain

| Feature | R2.dev | Custom Domain |
|---------|--------|---------------|
| Setup | Easy (just enable) | Need Cloudflare DNS |
| SSL | Auto (Cloudflare) | Auto (Cloudflare) |
| **Bandwidth cost** | ⚠️ **$0.36/TB** | ✅ **$0** (FREE) |
| Domain | Long ugly URL | Clean branded URL |

**Bandwidth cost with R2.dev**:
- 1 GB bandwidth = $0.00036
- 10 GB bandwidth = $0.0036 (~Rp 57)
- 100 GB bandwidth = $0.036 (~Rp 570)
- 1 TB bandwidth = $0.36 (~Rp 5,700)

**Still cheaper than ImageKit**, but **NOT FREE** like custom domain!

### 2. Custom Domain Requires Cloudflare

To use custom domain `cdn.sparkstage55.com` with **$0 bandwidth**:
- Domain nameservers **MUST** be on Cloudflare
- Since you're moving back to Domainesia, custom domain won't work

### 3. Future Migration Back to Cloudflare

When you're ready to move back to Cloudflare:
1. Change nameservers back to Cloudflare
2. Add DNS records for website (Vercel)
3. Custom domain R2 will work again
4. Zero bandwidth cost returns

---

## Current Status After Domainesia Rollback

| Item | Status |
|------|--------|
| Website domain | ⏸️ Moving back to Domainesia (2-24 hours) |
| R2 bucket files | ✅ Still in R2 (2,227 images) |
| R2 public access | ⚠️ Need to enable R2.dev |
| Custom domain R2 | ❌ Won't work (DNS not on Cloudflare) |
| R2.dev domain | ⏸️ Need to enable public access |
| Database cutover | ⏸️ Waiting for public access |

---

## Next Steps

1. **NOW**: Enable R2.dev public access (see steps above)
2. **NOW**: Change nameservers back to Domainesia (in progress)
3. **Wait 2-24 hours**: Website DNS propagation
4. **After website UP**: Test R2.dev URLs
5. **After R2.dev works**: Run database cutover

---

## Alternative: Keep Cloudflare for Best Savings

If you want **$0 bandwidth cost**:
1. Keep nameservers on Cloudflare
2. Just add 2 DNS records for Vercel (5 minutes)
3. Website UP in 30 minutes
4. Custom domain R2 continues to work
5. **Save ~$116/year** instead of ~$100/year

**Trade-off**:
- Cloudflare DNS: $0 bandwidth, 30 min setup, custom domain ✅
- Domainesia DNS: Small bandwidth cost, 2-24 hours wait, ugly R2.dev URL ❌

---

**Current decision**: Moving back to Domainesia  
**R2 public access**: Needs to be enabled via Cloudflare Dashboard
