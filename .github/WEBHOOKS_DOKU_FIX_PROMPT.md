# DOKU Webhook Fix Prompt - Reusable Template

Gunakan prompt ini untuk fix webhook DOKU yang tidak bekerja di project manapun.

---

## 🔴 Symptoms (Gejala yang muncul)

- ✗ Webhook returns **403 Forbidden** atau **signature_mismatch**
- ✗ `matchedTarget: null` di logs
- ✗ Order status tetap `pending` setelah pembayaran sukses
- ✗ Tickets/products tidak ter-generate meski pembayaran berhasil
- ✗ DOKU Back Office test notification gagal

---

## 🔍 Root Cause Analysis

**Ada 3 masalah yang biasa terjadi:**

1. **Client ID Mismatch** → Error 403
   - `DOKU_CLIENT_ID` di Supabase secrets ≠ nilai di DOKU Dashboard

2. **Request-Target Path Mismatch** → signature_mismatch
   - Path webhook di DOKU Dashboard ≠ path yang diverifikasi function
   - Contoh: DOKU kirim ke `/functions/v1/webhook`, tapi function cari `/webhook`

3. **Secret Key Mismatch** → signature_mismatch
   - `DOKU_SECRET_KEY` di Supabase secrets ≠ Secret Key di DOKU Dashboard

---

## ✅ Step-by-Step Fix

### Step 1: Gather DOKU Credentials

Di **DOKU Back Office → Settings → API Credentials**, copy:
- **Client ID** (format: `BRN-XXXX-TIMESTAMP`)
- **Secret Key** (format: `SK-...`)
- Catat **Environment**: Production atau Sandbox?

### Step 2: Update Supabase Secrets

```bash
# Update Client ID
supabase secrets set DOKU_CLIENT_ID="<YOUR_CLIENT_ID>" --project-ref <PROJECT_ID>

# Update Secret Key
supabase secrets set DOKU_SECRET_KEY="<YOUR_SECRET_KEY>" --project-ref <PROJECT_ID>

# CRITICAL: Add webhook request target path
# Copy path dari DOKU notification URL
# Contoh: https://api.supabase.co/functions/v1/doku-webhook → /functions/v1/doku-webhook
supabase secrets set DOKU_WEBHOOK_REQUEST_TARGET="<WEBHOOK_PATH>" --project-ref <PROJECT_ID>
```

### Step 3: Find Webhook Function Path

1. Buka **DOKU Back Office → Notification Settings**
2. Lihat URL notification yang dikonfigurasi
3. Extract **path-nya saja**
   - Jika URL: `https://api.supabase.co/functions/v1/doku-webhook`
   - Path-nya: `/functions/v1/doku-webhook`

### Step 4: Redeploy Webhook Function

```bash
# Jika pakai naming pattern tertentu
supabase functions deploy <WEBHOOK_FUNCTION_NAME>

# Atau deploy semua functions yang related ke DOKU
npm run supabase:functions:deploy:doku-webhook
```

### Step 5: Test dari DOKU Back Office

1. Buka DOKU Back Office
2. Go to **Notification Settings**
3. Click **Send Test Notification**
4. Check logs di Supabase → Function logs

**Expected results:**
- ✅ No 403 errors
- ✅ Signature verification should pass (matchedTarget !== null)
- ✅ Status code 200

### Step 6: Verify Order Status in Database

```sql
-- Check order dari test notification
SELECT order_number, status, created_at
FROM orders
WHERE order_number LIKE '%TEST%' OR order_number LIKE '%sp-%'
ORDER BY created_at DESC
LIMIT 10;

-- Check webhook logs
SELECT order_number, event_type, success, error_message, created_at
FROM webhook_logs
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;

-- Check if tickets/products generated
SELECT COUNT(*) as ticket_count
FROM purchased_tickets
WHERE created_at > now() - interval '10 minutes';
```

---

## 🔧 Troubleshooting

### If still getting 403

**Problem**: Client ID mismatch  
**Check**:
```bash
# Compare values (replace with actual)
echo "DOKU Dashboard Client ID: BRN-0286-1776865015547"
supabase secrets get DOKU_CLIENT_ID --project-ref <PROJECT_ID>
# Should match exactly (case-sensitive, no spaces)
```

### If matchedTarget: null

**Problem**: Request-Target path tidak match  
**Check**:
```sql
-- Check what path was received
SELECT 
  payload->>'reason' as reason,
  payload->'diagnostics'->>'actual_request_pathname' as received_path,
  payload->'diagnostics'->'candidate_request_targets' as tried_candidates
FROM webhook_logs
WHERE event_type = 'invalid_signature'
ORDER BY created_at DESC
LIMIT 1;
```

**Fix**: Update `DOKU_WEBHOOK_REQUEST_TARGET` dengan path dari `actual_request_pathname`

### If signature_mismatch but Client ID valid

**Problem**: Secret Key mismatch  
**Check**:
1. Go to DOKU Dashboard again
2. Verify Secret Key value (copy ulang)
3. Update di Supabase: `supabase secrets set DOKU_SECRET_KEY="<NEW_VALUE>" --project-ref <PROJECT_ID>`
4. Redeploy function

---

## 📋 Complete Checklist Before Production

- [ ] DOKU_CLIENT_ID updated di Supabase secrets
- [ ] DOKU_SECRET_KEY updated di Supabase secrets
- [ ] DOKU_WEBHOOK_REQUEST_TARGET set dengan path yang benar
- [ ] DOKU_IS_PRODUCTION flag sesuai (production atau sandbox)
- [ ] PUBLIC_APP_URL set dengan correct domain
- [ ] DOKU Back Office notification URL pointing ke correct endpoint
- [ ] Webhook function di-redeploy setelah secrets update
- [ ] Test notification dari DOKU Back Office berhasil (no 403)
- [ ] Order status berubah jadi `paid` setelah test
- [ ] Tickets/products ter-generate di database
- [ ] Frontend bisa melihat data di "My Tickets" atau "My Orders"

---

## 🚀 After Fix - Ongoing Monitoring

### Daily Checks (First Week)

```sql
-- Check for stuck pending orders
SELECT order_number, status, expires_at
FROM orders
WHERE status = 'pending'
  AND expires_at < now()
ORDER BY created_at DESC;

-- Check for webhook errors
SELECT COUNT(*) as error_count, event_type
FROM webhook_logs
WHERE created_at > now() - interval '24 hours'
  AND success = false
GROUP BY event_type;

-- Check if reconciliation working
SELECT COUNT(*) as reconciled_count
FROM webhook_logs
WHERE event_type IN ('reconciliation_success', 'reconcile_doku_payments')
  AND created_at > now() - interval '1 hour';
```

### Weekly Audit

- Verify recent orders have correct status progression
- Check no stale pending orders accumulating
- Verify cron jobs (reconciliation, expiry) running

---

## 📚 Related Files to Check

For websites with similar setup (website print dengan sp-... products):

- Webhook function: `supabase/functions/[webhook-name]/index.ts`
- Shared DOKU logic: `supabase/functions/_shared/doku.ts`
- Environment config: `.env` dan Supabase Secrets
- Payment effects: `supabase/functions/_shared/payment-effects.ts`

---

## 💡 Pro Tips

1. **Always use `--project-ref` explicitly** - jangan rely pada default project
2. **Test dengan low-value orders first** - sebelum full rollout
3. **Keep webhook logs untuk audit trail** - jangan delete logs terlalu cepat
4. **Verify DOKU environment consistency**:
   - If `DOKU_IS_PRODUCTION=false` (sandbox)
   - Then DOKU Dashboard juga harus di sandbox environment
5. **Monitor reconciliation cron** - memastikan stuck orders ter-recover

---

## 📞 Emergency Contacts & Resources

- **DOKU Support**: Check DOKU Dashboard untuk support channel
- **Supabase Docs**: https://supabase.com/docs/reference/functions
- **Common DOKU Issues**: Check payment-deadlock-review.md di docs/runbooks/

---

**Last Updated**: May 5, 2026  
**Status**: Production Ready ✅
