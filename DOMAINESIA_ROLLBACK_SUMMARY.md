# Rollback ke Domainesia DNS - Summary

**Date**: June 9, 2026  
**Status**: 🔄 IN PROGRESS

---

## 🎯 Yang Kamu Lakukan Sekarang

### ✅ Step 1: Change Nameservers di Domainesia

1. Login: https://www.domainesia.com/clientarea.php
2. Go to: **Domains** > **My Domains** > **sparkstage55.com**
3. Change Nameservers:
   - **FROM** (Cloudflare):
     ```
     hope.ns.cloudflare.com
     simon.ns.cloudflare.com
     ```
   - **TO** (Domainesia):
     ```
     dns1.domainesia.com
     dns2.domainesia.com
     dns3.domainesia.com
     dns4.domainesia.com
     ```
4. Save changes

---

## ⏱️ Waiting Period

**Timeline setelah change nameservers**:
- Minimum: 2-4 jam
- Average: 4-12 jam
- Maximum: 24-48 jam

**Why so long?** Nameserver change adalah **global DNS update**, bukan hanya record change.

---

## 🔍 Cara Check Progress

### Check Nameserver Status:

```bash
nslookup -type=ns sparkstage55.com 8.8.8.8
```

**Saat masih Cloudflare**:
```
sparkstage55.com nameserver = hope.ns.cloudflare.com
sparkstage55.com nameserver = simon.ns.cloudflare.com
```

**Setelah berhasil ke Domainesia**:
```
sparkstage55.com nameserver = dns1.domainesia.com
sparkstage55.com nameserver = dns2.domainesia.com
sparkstage55.com nameserver = dns3.domainesia.com
sparkstage55.com nameserver = dns4.domainesia.com
```

### Check Website Status:

```bash
nslookup sparkstage55.com 8.8.8.8
```

**Expected result** (setelah propagation):
```
Name: sparkstage55.com
Address: [IP dari Vercel, biasanya 76.76.21.21 atau 76.76.21.98]
```

### Online Tools:

1. **DNS Checker**: https://dnschecker.org/
   - Enter: `sparkstage55.com`
   - Check: Global propagation map

2. **WhatsMyDNS**: https://www.whatsmydns.net/
   - Enter: `sparkstage55.com`
   - See: Which countries can reach your site

---

## 📋 Status Checklist

### ✅ Completed:
- [x] R2 bucket created
- [x] 2,227 product images uploaded to R2
- [x] R2 migration scripts created
- [x] Config updated to use R2.dev URL
- [x] Nameserver change initiated (by you)

### ⏸️ Waiting:
- [ ] DNS propagation (2-24 hours)
- [ ] Website accessible again
- [ ] Enable R2.dev public access
- [ ] Test R2.dev URLs
- [ ] Database cutover

### ⚠️ TODO After Website UP:
- [ ] Enable R2 public access (see `R2_ENABLE_PUBLIC_ACCESS.md`)
- [ ] Test R2.dev URL
- [ ] Run database cutover
- [ ] Test product images display

---

## ⚠️ Important: R2 Public Access

**After rollback to Domainesia**, you **MUST** enable R2.dev public access:

1. Login Cloudflare: https://dash.cloudflare.com
2. Go to: R2 > sparkstage-public-assets > Settings
3. Enable: **Public Access** or **R2.dev subdomain**
4. Test: https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png

**See full guide**: `R2_ENABLE_PUBLIC_ACCESS.md`

---

## 💰 Cost Implications

### Before (ImageKit):
- Storage: $0 (free tier)
- Bandwidth: $0.20/1,000 requests
- **Estimated monthly**: ~$10
- **Annual**: ~$120

### After Rollback (R2 with R2.dev):
- Storage: $0.015/GB = ~$0.003/month
- Bandwidth: **$0.36/TB** (NOT FREE!)
- **Estimated monthly**: ~$1-2
- **Annual**: ~$12-24

**Savings**: ~$96-108/year (still good, but not $0 bandwidth)

### If Used Custom Domain (Cloudflare DNS):
- Storage: $0.015/GB = ~$0.003/month
- Bandwidth: **$0/TB** (FREE!)
- **Estimated monthly**: ~$0.30
- **Annual**: ~$3.60

**Savings**: ~$116/year (maximum savings)

---

## 🔄 Alternative: Move Back to Cloudflare Later

When you're ready for **$0 bandwidth cost**:

1. Change nameservers back to Cloudflare
2. Add DNS records for Vercel:
   - A record: `@` → `76.76.21.21` (DNS only)
   - CNAME: `www` → `cname.vercel-dns.com` (DNS only)
3. Custom domain `cdn.sparkstage55.com` works again
4. Zero bandwidth cost returns

**Benefits of going back to Cloudflare**:
- ✅ $0 bandwidth (vs $0.36/TB with R2.dev)
- ✅ Custom domain (clean URLs)
- ✅ Cloudflare CDN (faster globally)
- ✅ DDoS protection
- ✅ Analytics

---

## 📊 What Changed?

| Item | Before Rollback | After Rollback |
|------|----------------|----------------|
| Website DNS | Cloudflare (down) | Domainesia (waiting) |
| R2 bucket | ✅ Active | ✅ Active |
| R2 files | ✅ 2,227 images | ✅ 2,227 images |
| R2 URL | cdn.sparkstage55.com | R2.dev (need enable) |
| Bandwidth cost | $0 (planned) | $0.36/TB |
| Website status | ❌ Down | ⏸️ Waiting DNS |

---

## 🆘 If Website Still Down After 24 Hours

### Check 1: Nameservers at Registrar

Verify nameservers are actually changed:
```bash
nslookup -type=ns sparkstage55.com 8.8.8.8
```

Should show Domainesia nameservers.

### Check 2: DNS Records at Domainesia

1. Login Domainesia
2. Go to: DNS Management for sparkstage55.com
3. Verify records exist:
   - A record or CNAME to Vercel
   - Should point to Vercel IP or `cname.vercel-dns.com`

### Check 3: Vercel Domain Settings

1. Login Vercel: https://vercel.com/dashboard
2. Go to: Project > Settings > Domains
3. Verify `sparkstage55.com` is added
4. Check status (should be "Valid Configuration")

---

## 📝 Timeline Summary

| Time | Action | Status |
|------|--------|--------|
| Now | Change nameservers | ✅ YOU DID THIS |
| +2-4 hours | DNS starts propagating | ⏸️ WAIT |
| +4-12 hours | Website accessible in some regions | ⏸️ WAIT |
| +24-48 hours | Full global propagation | ⏸️ WAIT |
| After UP | Enable R2 public access | ⏸️ TODO |
| After R2 works | Database cutover | ⏸️ TODO |

---

## 🎯 Your Next Steps

1. **NOW**: Wait for DNS propagation (2-24 hours)
2. **Monitor**: Check website every 2-4 hours
3. **After website UP**: 
   - Enable R2.dev public access (Cloudflare dashboard)
   - Test R2.dev URLs
   - Run database cutover
4. **Optional later**: Move back to Cloudflare for $0 bandwidth

---

## 📞 Need Help?

If website still down after 24 hours:
1. Check nameserver status (command above)
2. Verify DNS records at Domainesia
3. Check Vercel domain settings
4. Contact Domainesia support

---

**Status**: ⏸️ Waiting for DNS propagation (2-24 hours)

**Next action**: Enable R2 public access after website is UP
