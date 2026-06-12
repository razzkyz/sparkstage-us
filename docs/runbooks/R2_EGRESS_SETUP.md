# Cloudflare R2 Egress Setup - Panduan Lengkap

Panduan ini menjelaskan cara setup **zero egress cost** dari Cloudflare R2 dengan public access dan custom domain.

## 🎯 Apa Itu Egress?

**Egress** = Data keluar dari storage ke internet (saat user download/view files)

### Perbandingan Egress Cost

| Provider | Egress Cost (per GB) | 100 GB/month |
|----------|---------------------|--------------|
| **AWS S3** | $0.09/GB | **$9** |
| **Google Cloud Storage** | $0.12/GB | **$12** |
| **Azure Blob** | $0.087/GB | **$8.70** |
| **ImageKit** | Included in plan | $9/month |
| **Cloudflare R2** | **$0** | **$0** 🎉 |

**Kenapa R2 Gratis?**
- Cloudflare punya global CDN network
- R2 → Cloudflare CDN = **internal transfer** (gratis)
- Cloudflare CDN → User = **gratis** (Cloudflare's business model)

---

## 📊 R2 Egress Architecture

### Standard Cloud Storage (AWS S3)
```
User Request
    ↓ (HTTP GET)
AWS S3 Bucket (private)
    ↓ (egress charged: $0.09/GB)
User Browser

💰 Cost: $9/month untuk 100 GB traffic
```

### Cloudflare R2 (Public Bucket)
```
User Request
    ↓ (HTTP GET)
Cloudflare CDN Edge (global cache) ← R2 Bucket (public)
    ↓                                    ↑
    └─ Cache Hit (99%)       Cache Miss (1%, internal transfer)
    ↓ (egress: $0)
User Browser

💰 Cost: $0/month untuk egress!
```

**Key Points**:
1. R2 bucket dengan **public access** = files bisa diakses langsung via URL
2. Cloudflare CDN **automatically caches** files yang sering diakses
3. Transfer R2 → Cloudflare CDN = **internal** (gratis)
4. Transfer Cloudflare CDN → User = **gratis** (bagian dari Cloudflare's value prop)

---

## 🔧 Setup Public Access (Step by Step)

### Step 1: Create R2 Bucket

1. Login [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sidebar → **R2 Object Storage**
3. Click **Create bucket**

**Settings**:
```
Bucket name: sparkstage-public-assets
Location: Automatic (Cloudflare pilih optimal)
Encrypt bucket: ✅ (default, gratis)
```

4. Click **Create bucket**


### Step 2: Enable Public Access ⚠️ PENTING!

**Ini adalah langkah KUNCI untuk zero egress cost!**

1. Masuk ke bucket `sparkstage-public-assets`
2. Tab **Settings**
3. Scroll ke section **Public access**
4. Saat ini status: **🔒 Disabled** (default)

5. Click button **Allow Access**

**Warning Dialog** akan muncul:
```
⚠️ Warning: Public buckets
Files in public buckets are accessible to anyone on the internet 
via the bucket's public URL.

☐ I understand that anyone will be able to access objects in this 
  bucket via the public URL

[Cancel] [Allow Access]
```

6. **Centang checkbox**: "I understand..."
7. Click **Allow Access**

**Status berubah** menjadi:
```
✅ Public access: Enabled
📋 Public Bucket URL: https://<account_id>.r2.cloudflarestorage.com
```

8. **COPY Public Bucket URL** dan simpan!

---

### Step 3: Test Public Access

**Upload test file**:
```bash
# Using AWS CLI (R2 is S3-compatible)
aws s3 cp test.jpg s3://sparkstage-public-assets/test.jpg `
  --endpoint-url https://<account_id>.r2.cloudflarestorage.com `
  --region auto

# Or using R2 Dashboard UI
# Bucket → Upload → Select file → Upload
```

**Test public URL**:
```bash
# Get public URL
$publicUrl = "https://<account_id>.r2.cloudflarestorage.com/test.jpg"

# Test dengan curl (no auth needed!)
curl -I $publicUrl

# Expected output:
# HTTP/2 200
# content-type: image/jpeg
# content-length: 12345
# cache-control: public, max-age=14400
```

✅ **Success** jika status `200 OK` tanpa authentication!

**⚠️ Troubleshooting**: Jika dapat `403 Forbidden`:
- Check public access masih enabled
- Verify file uploaded dengan path yang benar
- Wait 1-2 menit untuk configuration propagation


---

## 🌐 Setup Custom Domain (Recommended)

**Kenapa pakai custom domain?**
1. **Branding**: `media.sparkstage55.com` vs `xxx.r2.cloudflarestorage.com`
2. **Flexibility**: Bisa ganti provider tanpa ubah URLs di database
3. **SSL**: Auto-provision SSL cert dari Cloudflare
4. **Cache Control**: Lebih mudah manage caching rules
5. **Analytics**: Cloudflare analytics per subdomain

### Option A: Domain Sudah di Cloudflare DNS (Easy - 5 menit)

**Pre-requisite**: Domain `sparkstage55.com` sudah managed di Cloudflare DNS

**Steps**:

1. Masuk ke bucket `sparkstage-public-assets`
2. Tab **Settings**
3. Section **Custom Domains**
4. Click **Connect Domain**

**Form**:
```
Custom domain: media.sparkstage55.com
```

5. Click **Continue**

**Cloudflare akan otomatis**:
- Add CNAME record di DNS
- Provision SSL cert (Let's Encrypt)
- Setup CDN caching

**Verify DNS Record** (automatic):
```
Type: CNAME
Name: media
Target: <bucket-name>.<account-id>.r2.cloudflarestorage.com
Proxy: ✅ Proxied (orange cloud)
TTL: Auto
```

6. Wait **2-5 menit** untuk DNS propagation

**Test custom domain**:
```bash
# Test DNS resolution
nslookup media.sparkstage55.com

# Test HTTPS access
curl -I https://media.sparkstage55.com/test.jpg

# Expected: HTTP/2 200 (via Cloudflare CDN)
```

✅ **Success** jika status `200 OK` via custom domain!

---

### Option B: Domain TIDAK di Cloudflare DNS (Manual - 15 menit)

**Pre-requisite**: Domain managed di DNS provider lain (GoDaddy, Namecheap, dll)

**Steps**:

1. R2 Dashboard → Custom Domains → **Connect Domain**
2. Enter: `media.sparkstage55.com`
3. Cloudflare akan show **DNS record** yang harus ditambahkan

**Manual DNS Setup**:
```
Type: CNAME
Name: media
Value: <bucket-name>.<account-id>.r2.cloudflarestorage.com
TTL: 300 (or default)
```

4. Login ke DNS provider kamu (e.g., GoDaddy)
5. DNS Management → Add Record
6. Input values dari Cloudflare
7. Save record

8. Wait **5-30 menit** untuk DNS propagation (depends on TTL)

**Verify**:
```bash
nslookup media.sparkstage55.com
# Should resolve to Cloudflare IPs
```

**⚠️ SSL Certificate**:
- Jika domain di Cloudflare: SSL otomatis ✅
- Jika domain di luar: Setup SSL manual atau non-proxied CNAME


---

## ⚡ CDN Caching Configuration

Cloudflare CDN automatically caches files dari R2 public bucket, tapi kamu bisa customize.

### Default Caching Behavior

**Cloudflare otomatis cache berdasarkan file extension**:
```
Images (.jpg, .png, .webp, .gif):
  - Cache TTL: 2 hours (first request)
  - Subsequent: Edge cached (instant)
  - Browser cache: 4 hours (default)

Static files (.css, .js):
  - Cache TTL: 2 hours
  
Videos (.mp4, .webm):
  - Cache TTL: 2 hours
  - Range requests: Supported
```

### Custom Cache Rules (Optional)

**Scenario**: Force longer cache untuk images (1 week)

1. Cloudflare Dashboard → Domain → **Caching** → **Configuration**
2. **Cache Rules** → Create rule

**Rule Example**:
```yaml
Rule name: R2 Images Long Cache
When incoming requests match:
  - Hostname equals: media.sparkstage55.com
  - File extension is in: jpg png webp gif

Then:
  - Eligible for cache: Yes
  - Edge TTL: 7 days
  - Browser TTL: 1 day
```

3. Save rule

**Benefits**:
- Images cached di Cloudflare edge 7 hari
- Reduce R2 → CDN transfer (meski gratis, tetap lebih cepat)
- Faster load times untuk repeat visitors

### Purge Cache (Jika Perlu)

**Scenario**: Update image tapi filename sama (rare, not recommended)

1. Cloudflare Dashboard → Domain → **Caching** → **Configuration**
2. **Purge Cache** → **Custom Purge**
3. Enter specific URLs:
   ```
   https://media.sparkstage55.com/products/123/abc.jpg
   ```
4. Click **Purge**

**⚠️ Best Practice**: Jangan purge cache frequently. Gunakan unique filenames (UUID) untuk versioning.


---

## 🔒 Security Considerations

### Public vs Private Buckets

**Public Bucket** (Spark Stage):
```
✅ Use when:
- Files are meant to be publicly accessible (product images)
- Need zero egress cost
- Don't need access control per-file
- SEO-friendly URLs (crawlable)

❌ Don't use when:
- Files contain sensitive data (user documents, private photos)
- Need authentication/authorization per-file
- Compliance requires access logging per-user
```

**Private Bucket** (Alternative):
```
✅ Use when:
- Files need access control
- Temporary access via signed URLs
- User-specific content (invoices, receipts)

❌ Cost:
- Egress still $0 via Cloudflare CDN
- BUT: Need presigned URLs (more complex)
```

### Security Best Practices

1. **Don't store sensitive data** di public bucket
   ```
   ❌ Bad: user_invoice_123.pdf
   ❌ Bad: customer_data.json
   ✅ Good: product_images, public assets
   ```

2. **Use HTTPS only** (Cloudflare enforces ini by default)
   ```
   ✅ https://media.sparkstage55.com/...
   ❌ http://media.sparkstage55.com/... (redirect to HTTPS)
   ```

3. **Implement CORS** jika perlu (untuk browser uploads)
   ```
   R2 Settings → CORS Configuration:
   
   Allowed Origins: https://www.sparkstage55.com
   Allowed Methods: GET, HEAD
   Allowed Headers: *
   Max Age: 3600
   ```

4. **Monitor access logs** (Cloudflare Analytics)
   - Track unusual traffic spikes
   - Detect hotlinking abuse
   - Monitor bandwidth usage

5. **Hotlinking protection** (Optional)
   ```
   Cloudflare WAF Rule:
   
   If:
     - Referrer does not contain: sparkstage55.com
     - File extension: jpg, png, webp
   Then:
     - Challenge (CAPTCHA)
   ```


---

## 📊 Cost Breakdown

### Cloudflare R2 Pricing (2026)

```
Storage:
  - $0.015 per GB/month
  - Example: 3 GB × $0.015 = $0.045/month

Class A Operations (PUT, POST, LIST, COPY):
  - $4.50 per million requests
  - Example: 1,598 uploads = $0.007 (one-time)

Class B Operations (GET, HEAD):
  - $0.36 per million requests
  - Example: 100K views/month = $0.036/month

Egress (Data out):
  - $0 per GB ← 🎉 ZERO COST!
  - Unlimited bandwidth, no overage fees
```

### Real Example: Spark Stage

**Assumptions**:
- Storage: 3 GB product images
- Traffic: 50K image views/month
- Upload: 100 new images/month

**Monthly Cost Calculation**:
```
Storage:    3 GB × $0.015 =           $0.045
Class A:    100 uploads × $0.0000045 = $0.0004
Class B:    50K views × $0.00000036 =  $0.018
Egress:     15 GB × $0 =              $0.000
                                       -------
TOTAL:                                 $0.064/month
                                       or ~$0.77/year
```

### Comparison: ImageKit vs R2

| Metric | ImageKit Free | ImageKit Paid | R2 |
|--------|---------------|---------------|-----|
| **Storage** | 20 GB | 100 GB | 3 GB (actual) |
| **Bandwidth** | 20 GB/month | 100 GB/month | **Unlimited** |
| **Monthly Cost** | $0 → $9 (exceed) | $9+ | **$0.06** |
| **Annual Cost** | $108 | $108+ | **$0.77** |
| **Savings** | - | - | **$107.23/year** |

**Break-even Analysis**:
```
ImageKit Free limit: 20 GB bandwidth/month
Spark Stage usage: 25-30 GB/month (exceed → paid)

Cost before R2: $9/month (paid plan)
Cost after R2:  $0.06/month
Savings:        $8.94/month = $107.28/year
```

**ROI**:
- Migration effort: ~3 hours
- Annual savings: $107.28
- Equivalent hourly rate: **$35.76/hour** 🎯


---

## 🚀 Performance Optimization

### Edge Caching Strategy

**Cloudflare Edge Locations** (200+ cities globally):
- Jakarta, Singapore, Kuala Lumpur (Asia)
- Sydney, Melbourne (Oceania)
- Los Angeles, San Francisco (Americas)
- London, Frankfurt (Europe)

**Cache Hit Ratio Target**: > 95%

**Optimization Tips**:

1. **Use consistent URLs** (no query params for versioning)
   ```
   ✅ Good: /products/123/abc-v2.jpg
   ❌ Bad:  /products/123/abc.jpg?v=2 (cache busting)
   ```

2. **Set proper Cache-Control headers**
   ```
   R2 metadata:
   Cache-Control: public, max-age=31536000, immutable
   ```

3. **Use WebP/AVIF formats** (smaller file size)
   ```
   Before: product.jpg (500 KB)
   After:  product.webp (120 KB) ← 76% reduction
   ```

4. **Implement lazy loading** (frontend)
   ```html
   <img src="..." loading="lazy" alt="..." />
   ```

5. **Preload critical images**
   ```html
   <link rel="preload" as="image" href="hero.jpg" />
   ```

### Performance Benchmarks

**Target Metrics** (from Indonesia):
```
TTFB (Time to First Byte):    < 100ms
Image Load Time (100 KB):     < 300ms
Largest Contentful Paint:     < 2.5s
Cache Hit Rate:                > 95%
```

**Actual Testing** (via webpagetest.org):
```
Test: Jakarta → media.sparkstage55.com

First Request (cold cache):
  - DNS:          15ms
  - Connect:      45ms
  - TLS:          60ms
  - TTFB:         85ms
  - Download:     200ms
  Total:          405ms

Second Request (warm cache):
  - Edge cached:  25ms ← 94% faster!
```

### Troubleshooting Slow Performance

**Issue 1: High TTFB (> 500ms)**
```
Diagnosis:
  - Check R2 region (should be auto)
  - Verify custom domain using Cloudflare CDN (orange cloud)
  - Check for network issues (traceroute)

Fix:
  - Enable "Speed" optimizations in Cloudflare dashboard
  - Use custom domain (not raw R2 URL)
```

**Issue 2: Low Cache Hit Rate (< 80%)**
```
Diagnosis:
  - Check if URLs have query params
  - Verify Cache-Control headers
  - Review cache purge frequency

Fix:
  - Use unique filenames instead of versioning query params
  - Set longer Cache-Control max-age
  - Reduce unnecessary cache purges
```


---

## 🔍 Monitoring & Analytics

### Cloudflare R2 Analytics

**Dashboard**: Cloudflare → R2 → Bucket → Analytics

**Key Metrics to Monitor**:

1. **Storage Metrics**
   ```
   - Total Objects: Track growth (should be ~1600+)
   - Storage Used: Monitor GB (alert if > 5 GB)
   - Storage Cost: ~$0.015/GB/month
   ```

2. **Request Metrics**
   ```
   - Class A Operations: PUT/POST (new uploads)
   - Class B Operations: GET/HEAD (user views)
   - Success Rate: Should be > 99.9%
   ```

3. **Egress Metrics**
   ```
   - Bandwidth Out: Track GB (verify cost = $0)
   - Traffic by Country: Understand user distribution
   - Cache Hit Ratio: Target > 95%
   ```

**Set Up Alerts** (Recommended):
```
Alert 1: Storage > 5 GB
Alert 2: Class B Ops > 1M/day (unusual traffic)
Alert 3: Error rate > 0.1%
```

### Cloudflare Analytics (Custom Domain)

**Dashboard**: Cloudflare → Domain → Analytics → Traffic

**Metrics**:
```
- Requests: Views per day/week/month
- Bandwidth: Data transferred (verify matches R2)
- Cache Hit Ratio: % served from edge (not R2)
- Response Codes: Monitor 404s, 500s
- Top URLs: Most requested images
- Geographic Distribution: User locations
```

**Example Report**:
```
Period: Last 30 days
Total Requests: 125,000
Bandwidth: 18.5 GB
Cache Hit Ratio: 96.3% ← Excellent!
404 Errors: 23 (0.018%) ← Acceptable
Avg Response Time: 42ms
```

### Log Analysis (Advanced)

**Enable Logpush** (Business Plan+):
```
Cloudflare → Logs → Logpush

Destination: R2 bucket (different from assets)
Fields: 
  - ClientIP
  - ClientRequestURI
  - CacheCacheStatus
  - EdgeResponseBytes
  - EdgeResponseStatus

Schedule: Every 5 minutes
```

**Query Logs** (SQL/ClickHouse):
```sql
-- Top 10 most accessed images
SELECT ClientRequestURI, COUNT(*) as hits
FROM cloudflare_logs
WHERE EdgeResponseStatus = 200
GROUP BY ClientRequestURI
ORDER BY hits DESC
LIMIT 10;

-- 404 errors (broken image links)
SELECT ClientRequestURI, COUNT(*) as errors
FROM cloudflare_logs
WHERE EdgeResponseStatus = 404
GROUP BY ClientRequestURI
ORDER BY errors DESC;
```


---

## 📝 Checklist: Setup Egress (Quick Reference)

### Phase 1: R2 Bucket Setup
- [ ] Create R2 bucket: `sparkstage-public-assets`
- [ ] Enable **Public Access** (CRITICAL untuk zero egress!)
- [ ] Copy Public Bucket URL
- [ ] Test public URL dengan curl (status 200)
- [ ] Create API token (Object Read & Write)
- [ ] Save credentials securely

### Phase 2: Custom Domain (Optional tapi Recommended)
- [ ] Choose subdomain: `media.sparkstage55.com`
- [ ] R2 → Connect Custom Domain
- [ ] Verify DNS CNAME record created
- [ ] Wait 2-5 menit untuk propagation
- [ ] Test custom domain dengan curl
- [ ] Verify SSL cert active (HTTPS)

### Phase 3: CDN Caching (Optional Tuning)
- [ ] Review default cache behavior (2 hours TTL)
- [ ] Create custom cache rule (7 days untuk images)
- [ ] Test cache hit ratio (target > 95%)
- [ ] Setup cache purge process (if needed)

### Phase 4: Security
- [ ] Verify HTTPS enforcement
- [ ] Setup CORS policy (if needed)
- [ ] Review hotlinking protection (optional)
- [ ] Setup access monitoring/alerts

### Phase 5: Monitoring
- [ ] Cloudflare R2 Analytics dashboard
- [ ] Cloudflare Domain Analytics (traffic)
- [ ] Set alert: Storage > 5 GB
- [ ] Set alert: Error rate > 0.1%
- [ ] Weekly review: Cache hit ratio

### Phase 6: Documentation
- [ ] Document public URL in `.env` files
- [ ] Update architecture docs
- [ ] Train team on R2 setup
- [ ] Create troubleshooting runbook

---

## 🎓 Advanced Topics

### Multi-Region R2 (Future)

Currently R2 auto-selects region. For future scaling:
```
Future feature: Explicitly choose region
- Asia-Pacific: Singapore, Tokyo, Sydney
- Americas: US West, US East
- Europe: Amsterdam, Frankfurt

Benefit: Lower latency to origin
Note: Cloudflare edge caching makes this less critical
```

### R2 + Workers (Advanced)

**Use case**: Image transformation on-the-fly
```javascript
// Cloudflare Worker: Resize images dynamically
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const width = url.searchParams.get('w') || 800;
    
    // Fetch from R2
    const object = await env.R2_BUCKET.get(url.pathname);
    
    // Transform with Workers
    const transformed = await transformImage(object, { width });
    
    return new Response(transformed, {
      headers: { 
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }
}
```

**Cost**:
- Workers: $5/month for 10M requests
- Still cheaper than ImageKit if you need transforms

### Backup Strategy

**3-2-1 Backup Rule**:
```
3 copies: R2 (primary) + Local backup + Cloud backup
2 different media: SSD + Object storage
1 offsite: Different cloud provider
```

**Example**:
```
Primary: Cloudflare R2 (production)
Backup 1: Local disk (manifest + files)
Backup 2: AWS S3 Glacier (cold storage, $0.004/GB)
```

---

## 📚 Resources

### Official Documentation
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Public Buckets Guide](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Custom Domains](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains)

### Community Resources
- Cloudflare Community Forum
- R2 Discord Channel
- GitHub: cloudflare/workers-sdk

### Tools
- [AWS CLI](https://aws.amazon.com/cli/) (S3-compatible for R2)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare CLI)
- [Rclone](https://rclone.org/) (Sync tool dengan R2 support)

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-09  
**Purpose**: Zero egress cost setup untuk Spark Stage  
**Estimated Savings**: $107/year 💰

