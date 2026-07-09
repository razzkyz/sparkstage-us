# Cloudflare DNS + R2 Migration Guide

**Status:** Ready to Execute
**Last Updated:** 2026-06-10
**Estimated Total Time:** 1-2 hours

---

## 🎯 MIGRATION GOALS

1. Switch nameserver dari Domainesia → Cloudflare
2. Enable R2 custom domain untuk zero-cost egress
3. Cutover database dari ImageKit → R2
4. Monitor stability

---

## ✅ PRE-MIGRATION CHECKLIST

**Verify sebelum mulai:**

- [x] DNS records lengkap di Cloudflare (7 records)
- [x] R2 bucket ready: `sparkstage-public-assets`
- [x] 2,227 product images uploaded to R2
- [x] Custom domain configured: `cdn.sparkstage55.com`
- [x] SSL certificate provisioned
- [x] Cutover script ready: `scripts/cutover-products-to-r2.sql`
- [x] Rollback script ready: `scripts/rollback-to-imagekit.sql`
- [ ] Website stable (WiFi kantor bisa akses)
- [ ] Pick low-traffic time window (malam/weekend)
- [ ] Team on standby untuk testing
- [ ] Backup database sebelum cutover

---

## 📋 CLOUDFLARE DNS RECORDS (VERIFIED)

```
1. sparkstage55.com → A → 76.76.21.21 (DNS only)
2. www → CNAME → cname.vercel-dns.com (DNS only)
3. api → CNAME → hogzjapnkvsihvvbgcdb.supabase.co (DNS only)
4. print → CNAME → cname.vercel-dns.com (DNS only)
5. cdn → R2 → sparkstage-public-assets.r2.cloudflarestorage.com (Proxied)
6. _vercel → TXT → "vc-domain-verify=..." (DNS only)
7. _acme-challenge.api → TXT → "YtraC-zUE4k..." (DNS only)
```

**IMPORTANT:** Only `cdn` is Proxied (orange cloud). Others must be DNS only (gray cloud).

---

## 🚀 MIGRATION STEPS

### PHASE 1: NAMESERVER SWITCH (30-60 minutes)

#### Step 1.1: Get Cloudflare Nameservers
1. Login to Cloudflare dashboard
2. Go to domain `sparkstage55.com` → DNS
3. Find nameservers (usually shown in overview):
   ```
   Example:
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```
4. Copy these nameservers

#### Step 1.2: Change Nameservers at Domainesia
1. Login to Domainesia
2. Go to domain management: `sparkstage55.com`
3. Find "Nameserver" section
4. Change from:
   ```
   dns1.domainesia.com
   dns2.domainesia.com
   dns3.domainesia.com
   dns4.domainesia.com
   ```
5. To Cloudflare nameservers (from Step 1.1)
6. **SAVE** changes

#### Step 1.3: Wait for Propagation
- Initial propagation: 5-30 minutes
- Full propagation: up to 24 hours
- **Don't panic if website temporarily unreachable during first 5-30 minutes**

#### Step 1.4: Test DNS Propagation
```bash
# Check dari command prompt/terminal
nslookup www.sparkstage55.com 8.8.8.8
```

Expected result:
```
Server:  dns.google
Address:  8.8.8.8

Non-authoritative answer:
Name:    cname.vercel-dns.com
Addresses:  76.76.21.21
            (other IPs)
Aliases:  www.sparkstage55.com
```

#### Step 1.5: Test Website Access
Test dari berbagai devices:
- [ ] Laptop via WiFi
- [ ] HP via WiFi
- [ ] HP via data seluler
- [ ] Different networks (rumah, kantor)

**Expected:** Semua bisa akses `www.sparkstage55.com` dengan normal

---

### PHASE 2: ENABLE R2 PUBLIC ACCESS (5 minutes)

#### Option A: Via Custom Domain (RECOMMENDED - Zero Egress Cost)

**Good news:** Custom domain `cdn.sparkstage55.com` sudah otomatis aktif setelah nameserver switch! ✅

Test access:
```
https://cdn.sparkstage55.com/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
```

**Expected:** Image loads correctly with Cloudflare SSL certificate

#### Option B: Via R2.dev URL (Has Egress Cost)

**Only if custom domain tidak jalan:**

1. Login to Cloudflare dashboard
2. Go to R2 → `sparkstage-public-assets` bucket
3. Click "Settings" tab
4. Find "Public Access" section
5. Click "Enable Public Access"
6. Confirm

Test access:
```
https://pub-9808d1f4ad9448a1ae0eccf1371cac00.r2.dev/products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png
```

**Expected:** Image loads correctly

---

### PHASE 3: DATABASE CUTOVER (15 minutes)

**⚠️ CRITICAL: Backup database first!**

#### Step 3.1: Backup Database
```bash
# Via Supabase dashboard
# Go to Database → Backups
# Create manual backup with label: "Before R2 migration"
```

#### Step 3.2: Verify R2 URLs Working
Test beberapa image URLs (custom domain):
```
https://cdn.sparkstage55.com/products/[product_id]/[image_filename].png
```

**MUST work before proceed!**

#### Step 3.3: Run Cutover Script

**Using Supabase SQL Editor:**
1. Login to Supabase dashboard
2. Go to "SQL Editor"
3. Open file: `scripts/cutover-products-to-r2.sql`
4. Copy entire content
5. Paste to SQL Editor
6. Click "Run"

**Script will:**
- Update 2,227 `product_images` records
- Change URLs from ImageKit → R2 custom domain
- Show affected row count

**Expected output:**
```
UPDATE 2227
```

#### Step 3.4: Verify Images Loading
1. Open website: `www.sparkstage55.com`
2. Browse product pages
3. Check images loading correctly
4. Test berbagai produk (at least 10 products)

**Expected:** All product images load from `cdn.sparkstage55.com`

#### Step 3.5: Monitor for Issues
- Check browser console for 404 errors
- Test product detail pages
- Test admin product manager
- Monitor Sentry/error logs (if any)

---

### PHASE 4: MONITORING (24 hours)

#### Check Points:
- [ ] Website uptime: `www.sparkstage55.com`
- [ ] Product images loading: check 20+ random products
- [ ] Admin panel working: product CRUD operations
- [ ] Mobile responsive: test on HP
- [ ] Different networks: WiFi, data seluler, rumah, kantor
- [ ] Performance: page load speed
- [ ] SSL certificates: all subdomains have valid certs

#### Monitor These Metrics:
1. **Website Uptime**
   - Check every 2 hours for first 24 hours
   - Use `www.sparkstage55.com` and `sparkstage55.com`

2. **Image Delivery**
   - Random sample 20 products
   - Check console for broken images
   - Verify URLs use `cdn.sparkstage55.com`

3. **Cloudflare Analytics**
   - Go to Cloudflare dashboard → Analytics
   - Check traffic patterns
   - Verify R2 egress = $0.00 💰

4. **Customer Reports**
   - Ask team lapangan untuk feedback
   - Monitor customer complaints (if any)

---

## 🔄 ROLLBACK PROCEDURE

**If ada masalah serius, rollback immediately:**

### Rollback Option 1: Database Only (Fast - 5 minutes)

**When to use:** Images not loading, but website accessible

1. Login to Supabase SQL Editor
2. Open file: `scripts/rollback-to-imagekit.sql`
3. Run script
4. Verify images loading from ImageKit

```sql
-- Script will revert all product_images URLs
-- From: https://cdn.sparkstage55.com/...
-- To: https://ik.imagekit.io/sparkdoku/...
```

### Rollback Option 2: Full Rollback (Slower - 30-60 minutes)

**When to use:** Website down or major DNS issues

1. **Revert Database** (if cutover was done)
   - Run `scripts/rollback-to-imagekit.sql`

2. **Revert Nameservers**
   - Login to Domainesia
   - Change nameservers back to:
     ```
     dns1.domainesia.com
     dns2.domainesia.com
     dns3.domainesia.com
     dns4.domainesia.com
     ```
   - Save changes

3. **Wait for Propagation**
   - 5-30 minutes for initial propagation
   - Test website access

4. **Verify Website Stable**
   - Test from multiple devices/networks
   - Confirm images loading from ImageKit

---

## 📊 SUCCESS CRITERIA

Migration dianggap **SUKSES** jika:

- ✅ Website uptime 100% (no downtime)
- ✅ All product images loading correctly
- ✅ Images delivered via `cdn.sparkstage55.com`
- ✅ SSL certificates valid on all subdomains
- ✅ No customer complaints
- ✅ Team lapangan dapat kerja normal
- ✅ Admin panel fully functional
- ✅ Cloudflare R2 egress cost = $0.00 💰
- ✅ No 404 errors in browser console
- ✅ Page load speed same or better

---

## 💰 COST SAVINGS ESTIMATE

**Before (ImageKit):**
- Bandwidth: Rp 50,000 - 200,000/month (depends on traffic)
- Storage: Included in plan

**After (Cloudflare R2 + Custom Domain):**
- Bandwidth: **Rp 0** (zero egress cost via cdn.sparkstage55.com) 🎉
- Storage: ~$0.50/month (2,227 images ≈ 500MB)

**Monthly Savings:** Rp 50,000 - 200,000/month

**Annual Savings:** Rp 600,000 - 2,400,000/year

---

## 🛠️ TROUBLESHOOTING

### Issue 1: Website Down After Nameserver Switch

**Symptoms:**
- `www.sparkstage55.com` tidak bisa diakses
- Error: "This site can't be reached"

**Solution:**
1. Wait 5-30 minutes (propagation delay)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private browsing
4. Test from different network (data seluler)
5. Check DNS propagation: `nslookup www.sparkstage55.com 8.8.8.8`
6. If masih down after 30 minutes → Rollback nameservers

---

### Issue 2: Images Not Loading After Cutover

**Symptoms:**
- Product pages show broken images
- Console error: 404 Not Found

**Solution:**
1. Check R2 public access enabled
2. Test direct R2 URL: `https://cdn.sparkstage55.com/products/[test-path]`
3. Verify DNS for `cdn` subdomain: `nslookup cdn.sparkstage55.com`
4. Check Cloudflare R2 bucket settings
5. If images tetap broken → Rollback database (`rollback-to-imagekit.sql`)

---

### Issue 3: SSL Certificate Error

**Symptoms:**
- Browser shows "Your connection is not private"
- SSL certificate invalid/expired

**Solution:**
1. Wait 5-10 minutes (SSL provisioning)
2. Check Cloudflare SSL settings: SSL/TLS → Full (not Flexible)
3. Verify certificate at: `https://www.ssllabs.com/ssltest/`
4. Force SSL regeneration di Cloudflare dashboard

---

### Issue 4: Some Devices Can Access, Others Can't

**Symptoms:**
- Laptop bisa, HP tidak bisa
- WiFi tidak bisa, data seluler bisa

**Solution:**
1. **DNS cache issue** (most common)
2. Restart router/device
3. Clear DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac
   sudo dscacheutil -flushcache
   ```
4. Change DNS to Google DNS (8.8.8.8, 8.8.4.4)
5. Wait 2-4 hours for automatic cache expiry

---

## 📝 POST-MIGRATION TASKS

**After migration sukses dan stable:**

### 1. Update Documentation
- [ ] Update `AGENTS.md` dengan status migrasi
- [ ] Update `.env.r2-migration` dengan final URLs
- [ ] Archive migration logs

### 2. Monitor Costs
- [ ] Check Cloudflare R2 billing dashboard
- [ ] Verify egress cost = $0.00
- [ ] Compare with previous ImageKit bills

### 3. Plan Upload Code Migration (Optional)
- [ ] Update `frontend/src/lib/publicImagekitUpload.ts`
- [ ] Update `supabase/functions/imagekit-auth/index.ts`
- [ ] Test new product uploads go to R2
- [ ] This can be done later (not urgent)

### 4. Cleanup (After 30 days)
- [ ] Verify all images accessible via R2
- [ ] Consider canceling ImageKit subscription
- [ ] Keep ImageKit backup for safety (optional)

---

## 🎯 TIMELINE RECOMMENDATION

### **Low-Risk Approach (Recommended):**

**Week 1:**
- Day 1: Review this guide thoroughly
- Day 2: Ensure WiFi kantor stable
- Day 3-4: Weekend - Execute Phase 1 (Nameserver switch)
- Day 5: Monitor website stability

**Week 2:**
- Day 1: Execute Phase 2 (Enable R2 public access)
- Day 2: Execute Phase 3 (Database cutover)
- Day 3-7: Monitor 24/7, fix issues if any

**Week 3:**
- Day 1-7: Normal operations, cost monitoring

**Week 4:**
- Declare migration complete
- Plan upload code migration (optional)

---

### **Fast Approach (Higher Risk):**

**Day 1 (Malam/Weekend):**
- Hour 1: Phase 1 - Nameserver switch
- Hour 2: Wait propagation + testing
- Hour 3: Phase 2 - Enable R2 public access
- Hour 4: Phase 3 - Database cutover
- Hour 5-24: Intensive monitoring

**Day 2-7:**
- Monitor stability
- Fix issues if any

---

## 📞 CONTACTS & SUPPORT

**If ada masalah:**

1. **Cloudflare Support**
   - Community: https://community.cloudflare.com/
   - Docs: https://developers.cloudflare.com/

2. **Domainesia Support**
   - Email: support@domainesia.com
   - LiveChat: https://www.domainesia.com/

3. **Vercel Support**
   - Email: support@vercel.com
   - Docs: https://vercel.com/docs

4. **Internal Team**
   - Have rollback script ready
   - Team on standby untuk testing

---

## ✅ FINAL CHECKLIST BEFORE EXECUTE

**Are you ready?**

- [ ] DNS records verified at Cloudflare (7 records)
- [ ] R2 bucket has 2,227 images uploaded
- [ ] Cutover + Rollback scripts tested locally
- [ ] Database backup created
- [ ] Low-traffic time window selected
- [ ] Team on standby for testing
- [ ] WiFi kantor stable and working
- [ ] Read entire migration guide
- [ ] Understand rollback procedure
- [ ] Have Cloudflare nameservers ready to copy
- [ ] Have Domainesia login credentials
- [ ] Have Supabase dashboard access
- [ ] Coffee ready ☕ (migration might take 1-2 hours)

**If all checked ✅, you're ready to migrate!** 🚀

---

**Good luck with the migration!** 🎉
