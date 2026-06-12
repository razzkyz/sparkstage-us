# 🔒 Website Security Implementation - Complete Guide

**Date:** May 20, 2026  
**Status:** ✅ IMPLEMENTED

---

## ✅ Security Measures Implemented

### 1. **.git & Sensitive Directories Protection** ✅
**File:** `vercel.json`

**What it does:**
- ❌ Blocks direct access to `/.git` folder
- ❌ Blocks `node_modules` directory
- ❌ Blocks `.env`, `.env.local`, `.env.production` files
- Redirects all attempts to homepage with 301 status code

**Security Headers Added:**
```
- Strict-Transport-Security (HSTS)
  Enforces HTTPS for 1 year + subdomains
  
- X-Content-Type-Options: nosniff
  Prevents MIME type sniffing attacks
  
- X-Frame-Options: SAMEORIGIN
  Prevents clickjacking attacks
  
- X-XSS-Protection: 1; mode=block
  Prevents cross-site scripting
  
- Referrer-Policy: strict-origin-when-cross-origin
  Controls referrer information leakage
  
- Permissions-Policy
  Disables camera, microphone, geolocation, payment APIs
```

**Testing:**
```bash
# Test .git protection
curl -I https://yourdomain.com/.git

# Expected Response:
# HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/
```

---

### 2. **Admin Route Protection** ✅
**Components:** `ProtectedRoute.tsx` + `AuthContext.tsx`

**What it does:**
- ✅ All admin routes (`/admin/*`) require login
- ✅ Checks for `isAdmin` role before rendering admin pages
- ✅ Redirects unauthorized users to `/login`
- ✅ Supports admin status checking during session refresh

**Protected Admin Routes (27 total):**
```
/admin/dashboard
/admin/cashier-dashboard
/admin/tickets
/admin/store
/admin/stages
/admin/dressing-room
/admin/product-orders
/admin/vouchers
/admin/banner-manager
/admin/event-page
... and 17 more
```

**How it works:**
```typescript
// In ProtectedRoute component:
if (adminOnly && !isAdmin) {
  return <Navigate to="/" replace />;
}
// User not logged in:
if (!user) {
  return <Navigate to="/login" replace />;
}
```

**Admin Roles Supported:**
- `admin` - Full access
- `super_admin` - Full access + system management
- `kasir` - Limited to sales dashboard
- `starguide` - QR scanning only

---

### 3. **Rate Limiting Middleware** ✅
**Files:**
- `supabase/functions/_shared/rate-limit.ts`
- `supabase/migrations/20260520110000_add_rate_limit_logs.sql`

**What it does:**
- 🛡️ Prevents brute force attacks on login (5 attempts per 15 min)
- 🛡️ Prevents checkout abuse (10 requests per 1 min)
- 🛡️ Prevents ticket validation spam (20 requests per 1 min)
- 🛡️ Prevents OTP/2FA exhaustion (5 attempts per 5 min)
- 📊 Logs all rate limit violations for monitoring

**Rate Limit Configurations:**
```typescript
LOGIN: 5 attempts / 15 minutes
CHECKOUT: 10 requests / 1 minute
TICKET_VALIDATION: 20 requests / 1 minute
OTP: 5 attempts / 5 minutes
API_GENERAL: 100 requests / 1 minute
```

**How to use in functions:**
```typescript
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../_shared/rate-limit.ts';

const result = await checkRateLimit(
  supabaseClient,
  userEmail, // identifier (email, IP, user_id)
  RATE_LIMIT_CONFIGS.LOGIN
);

if (!result.allowed) {
  return new Response(
    JSON.stringify({ error: 'Too many login attempts' }),
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      },
    }
  );
}
```

**Database Table:**
```sql
rate_limit_logs (
  key TEXT UNIQUE,              -- "login:user@email.com"
  request_count INTEGER,         -- Requests in current window
  window_start BIGINT,          -- When window started
  last_request_at BIGINT        -- Last request timestamp
)
```

---

### 4. **HTTPS Enforcement** ✅
**Configured in:** `vercel.json`

**What it does:**
- Forces all HTTP requests to HTTPS
- Sets HSTS header for 1 year (31536000 seconds)
- Prevents downgrade attacks

**Header:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

### 5. **Secure Headers Configuration** ✅
**Configured in:** `vercel.json`

| Header | Purpose | Value |
|--------|---------|-------|
| X-Content-Type-Options | Prevent MIME sniffing | `nosniff` |
| X-Frame-Options | Prevent clickjacking | `SAMEORIGIN` |
| X-XSS-Protection | Enable XSS filter | `1; mode=block` |
| Referrer-Policy | Control referrer info | `strict-origin-when-cross-origin` |
| Permissions-Policy | Disable sensors | Disables camera, mic, geolocation, payment |

---

## 🚀 Deployment Steps

### Step 1: Deploy vercel.json Changes
```bash
# Automatic on next push to main
git add vercel.json
git commit -m "security: add security headers and .git protection"
git push origin main
```

### Step 2: Deploy Rate Limiting Migration
```bash
npm run supabase:db:push
```

This will:
- ✅ Create `rate_limit_logs` table
- ✅ Add indexes for performance
- ✅ Set up cleanup function

### Step 3: Integrate Rate Limiting (Optional - Phased Rollout)
Choose 1-2 critical functions to test with:
```bash
# Start with login endpoint
# Then add to checkout functions
# Finally add to all API functions
```

---

## 📊 Monitoring & Logging

### Check Rate Limit Violations
```sql
-- See all rate limit violations (last 24 hours)
SELECT key, request_count, window_start, last_request_at
FROM rate_limit_logs
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 50;

-- Find users being rate limited frequently
SELECT 
  key, 
  COUNT(*) as violations,
  MAX(last_request_at) as latest
FROM rate_limit_logs
WHERE updated_at > NOW() - INTERVAL '7 days'
GROUP BY key
ORDER BY COUNT(*) DESC;
```

### Monitor Security Headers (in browser)
```javascript
// Open DevTools > Network tab
// Check Response Headers for each request
// Look for:
// - Strict-Transport-Security
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: SAMEORIGIN
```

---

## 🔍 Testing Security Measures

### Test 1: .git Protection
```bash
curl -v https://yourdomain.com/.git
# Should get 301 redirect or 404, NOT actual .git contents
```

### Test 2: Admin Route Access
```bash
# Without login
curl https://yourdomain.com/admin/dashboard
# Should redirect to /login

# With valid token (user not admin)
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://yourdomain.com/admin/dashboard
# Should redirect to /
```

### Test 3: Rate Limiting
```bash
# Simulate 6 login attempts within 15 minutes
for i in {1..6}; do
  curl -X POST https://yourdomain.com/api/login \
    -d '{"email":"test@test.com"}' \
    -w "\nAttempt $i - Status: %{http_code}\n"
  sleep 1
done
# Last attempt should return 429 (Too Many Requests)
```

### Test 4: HSTS Header
```bash
curl -I https://yourdomain.com/
# Check for header:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 📋 Checklist for Production

- [x] `.git` directory blocked
- [x] `.env` files blocked
- [x] Admin routes protected with authentication
- [x] Rate limiting table created
- [x] Security headers configured
- [x] HTTPS enforcement enabled
- [ ] Rate limiting integrated into login endpoint (pending)
- [ ] Rate limiting integrated into checkout endpoints (pending)
- [ ] Monitoring dashboard set up
- [ ] Security headers tested in all browsers
- [ ] Rate limiting tested with automated tools

---

## 🛠️ Next Steps

### Immediate (This Sprint)
1. Deploy security headers to production
2. Test .git protection is working
3. Verify admin routes require login

### Phase 2 (Next Sprint)
1. Integrate rate limiting into critical endpoints:
   - Login function
   - Checkout functions (tickets + products)
   - OTP/2FA functions
2. Set up monitoring dashboard
3. Create incident response playbook

### Phase 3 (Long-term)
1. Add DDoS protection (Cloudflare)
2. Implement Web Application Firewall (WAF)
3. Add API endpoint authentication tokens
4. Set up intrusion detection system (IDS)

---

## 📚 References

- [OWASP Top 10 Web Application Risks](https://owasp.org/www-project-top-ten/)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Preload List](https://hstspreload.org/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Secure Headers Checklist](https://securityheaders.com/)

---

## 📞 Support

**Questions about security implementation?**
- Check `docs/SECURITY_CHECKLIST.md` for initial assessment
- Review rate limit logs in Supabase dashboard
- Test security headers using https://securityheaders.com/

**Report security issues:**
- Do NOT post on public channels
- Email security team with details
- Include reproduction steps and impact assessment
