# 🔒 Security Checklist untuk Spark Stage

Status: **Partially Secured** - Ada foundation, tapi perlu hardening lebih lanjut

---

## 📋 **Implementation Status - May 20, 2026**

**Completed This Session:**
- ✅ Rate limiting added to checkout endpoints (10 requests/min per user)
- ✅ Secure headers configured in vercel.json (HSTS, X-Frame-Options, etc)
- ✅ Audit logging table created with RLS policies
- ✅ Audit triggers migration prepared (20260520110200)
- ✅ Admin routes fully protected with ProtectedRoute + adminOnly flags
- ✅ Input validation patterns standardized in RPC functions

**Ready for Next Session:**
- 🔄 Enable audit triggers (requires testing in non-prod first)
- 🔄 Dependency scanning setup (npm audit, snyk integration)
- 🔄 Penetration testing plan

---

## ✅ Sudah Ada (Good!)

- [x] **RLS (Row Level Security)** - Policies sudah protect data user & admin
- [x] **JWT Authentication** - Via Supabase Auth
- [x] **CORS Headers** - Prevent cross-origin attacks
- [x] **DOKU Webhook Signature Verification** - Payment webhooks verified
- [x] **Environment Variables** - Secrets tidak hardcoded
- [x] **Role-based Access Control** - Admin, kasir, starguide roles

---

## 🔴 CRITICAL (Segera!)

### 1. **SQL Injection Prevention**
- **Status**: ✅ Good (Supabase + parameterized queries)
- **Action**: Audit RPC functions - ensure NO string concatenation for user input

**Cek file:**
```bash
# Search untuk potential SQL injection
rg "CONCAT|string interpolation|template literal" supabase/functions/
```

**Fix jika ditemukan:**
- SELALU gunakan parameterized queries
- Jangan `SELECT * FROM table WHERE id = '${userId}'`
- GUNAKAN `SELECT * FROM table WHERE id = $1` dengan parameter array

---

### 2. **Password & Secrets Management**
- **Status**: ⚠️ Partial (Env vars bagus, tapi perlu audit)
- **Action**: Pastikan TIDAK ada secrets di commit history

**Run audit:**
```bash
# Cek history git untuk potential secrets yang terlanjur push
git log -p --all -S "DOKU_SECRET_KEY\|password\|token" | head -100

# Jika ada, gunakan git-filter-branch atau bfg repo-cleaner
```

**Checklist:**
- [ ] `.env.local` di `.gitignore` ✓
- [ ] Tidak ada API keys di kode
- [ ] Rotate semua secrets yang sudah pernah ter-expose
- [ ] Enable **Supabase Secrets Manager** untuk edge functions

---

### 3. **Rate Limiting pada Payment Functions**
- **Status**: ❌ MISSING - Tidak ada rate limit!
- **Action**: Tambah rate limiting untuk prevent brute force

**Functions yang BUTUH rate limiting:**
- `create-doku-ticket-checkout` ⚠️
- `create-doku-product-checkout` ⚠️
- `validate-entrance-ticket` ⚠️
- Login endpoint ⚠️

**Simple solution - Add Rate Limit Middleware:**

Create: `supabase/functions/_shared/rate-limit.ts`
```typescript
const RATE_LIMITS = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = userId;
  
  if (!RATE_LIMITS.has(key)) {
    RATE_LIMITS.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  
  const record = RATE_LIMITS.get(key)!;
  if (now > record.reset) {
    RATE_LIMITS.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  record.count++;
  return true;
}
```

---

### 4. **Input Validation & Sanitization**
- **Status**: ⚠️ Partial - Ada di beberapa tempat
- **Action**: Standardize validation di semua edge functions

**Buat validation helper:**

```typescript
// supabase/functions/_shared/validation.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  return /^(\+62|62|0)[0-9]{9,12}$/.test(phone);
}

export function sanitizeInput(input: string, maxLength: number = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"']/g, ''); // Remove dangerous chars
}
```

---

### 5. **HTTPS & Secure Headers**
- **Status**: ✅ Good (Vercel/Supabase enforce)
- **Action**: Verify production domain configuration

**Checklist:**
- [ ] Redirect HTTP → HTTPS (automatic di Vercel)
- [ ] HSTS header enabled (add to `vercel.json`)
- [ ] X-Frame-Options: DENY (prevent clickjacking)
- [ ] Content-Security-Policy header set

**Update `vercel.json`:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 🟠 HIGH PRIORITY (Minggu ini)

### 6. **CSRF Protection**
- **Status**: ⚠️ Partial (Supabase JWT helps, tapi perlu explicit token)
- **Action**: Tambah CSRF token di forms

```typescript
// Frontend: Generate token saat component mount
const csrfToken = crypto.randomUUID();
sessionStorage.setItem('csrf_token', csrfToken);

// Kirim di header: X-CSRF-Token: {token}
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  }
});
```

---

### 7. **XSS Prevention**
- **Status**: ✅ Good (React auto-escape)
- **Action**: Audit dangerouslySetInnerHTML usage

```bash
# Cari penggunaan dangerouslySetInnerHTML
rg "dangerouslySetInnerHTML" frontend/src/
```

**Jika ada:** Review dan replace dengan sanitizer library (DOMPurify)

---

### 8. **Audit Logging**
- **Status**: ⚠️ Partial - Ada webhook_logs, tapi tidak semua action
- **Action**: Log semua sensitive actions

**Sensitive actions yang harus di-log:**
- Admin role changes ❌
- Payment refunds ❌
- Voucher modifications ❌
- Product stock changes ❌

**Create table untuk audit log:**
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- e.g., 'admin_role_assigned'
  table_name TEXT,
  record_id BIGINT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (admin only read)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_role_assignments
    WHERE user_id = auth.uid() AND role_name = 'admin'
  ));
```

---

### 9. **Payment Security**
- **Status**: ✅ Good - DOKU signature verification ada
- **Action**: Verify idempotency dan double-charging prevention

**Checklist:**
- [x] Webhook signature verified
- [x] Idempotency keys digunakan
- [ ] Payment amount never comes from user input (validate server-side)
- [ ] Refund protection (prevent over-refunds)

**Add payment validation:**
```typescript
// supabase/functions/_shared/payment-validation.ts
export function validatePaymentAmount(
  calculatedAmount: number,
  submittedAmount: number,
  tolerance: number = 0 // No tolerance for payments!
): boolean {
  return Math.abs(calculatedAmount - submittedAmount) <= tolerance;
}
```

---

## 🟡 MEDIUM PRIORITY (Bulan depan)

### 10. **API Key Rotation**
- **Action**: Set schedule untuk rotate
  - DOKU_SECRET_KEY: Quarterly
  - IMAGEKIT_PRIVATE_KEY: Quarterly
  - Supabase service role: Never (immutable)

### 11. **DDoS Protection**
- **Action**: Enable Cloudflare atau ddos-protection
  - Vercel sudah punya basic protection
  - Consider Cloudflare Pro untuk advanced rules

### 12. **Dependency Scanning**
- **Action**: Setup automated scanning
```bash
npm audit --audit-level=moderate
npm outdated
```

### 13. **Penetration Testing**
- **Action**: Hire security firm OR use automated tools
  - OWASP ZAP (free)
  - Burp Suite Community (free)

---

## 📋 Implementation Priority

### Week 1 (ASAP)
1. [ ] Rate limiting pada checkout functions
2. [ ] Input validation & sanitization
3. [ ] Fix secure headers di Vercel
4. [ ] Audit secrets dalam git history

### Week 2
5. [ ] Implement audit logging
6. [ ] Add CSRF token protection
7. [ ] Payment amount validation

### Week 3+
8. [ ] Dependency scanning setup
9. [ ] Security testing automation
10. [ ] Penetration testing

---

## 🧪 Security Testing Commands

```bash
# 1. Check for hardcoded secrets
git log -p --all | grep -i "password\|secret\|token" | head -20

# 2. Audit NPM packages
npm audit

# 3. Check TypeScript strictness
npm run lint

# 4. Test RLS policies
# (via Supabase SQL Editor - run as anon user)
SELECT * FROM orders; -- Should return error or empty

# 5. Validate JWT tokens
# (Test with invalid token)
curl -H "Authorization: Bearer INVALID_TOKEN" \
  https://your-app.com/api/protected-endpoint
```

---

## 📚 Resources

- [OWASP Top 10 2023](https://owasp.org/Top10/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/overview)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Payment Card Industry Data Security Standard (PCI DSS)](https://www.pcisecuritystandards.org/)

---

## 🎯 Next Step

Start dengan:
1. **Rate limiting** - Prevent brute force attacks
2. **Input validation** - Prevent injection attacks
3. **Secure headers** - Prevent clickjacking & XSS

Estimate: **2-3 jam untuk implement semuanya**

Butuh bantuan dengan salah satu? Bilang aja! 🚀
