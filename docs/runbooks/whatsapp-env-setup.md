# Environment Setup - WhatsApp Invoice System

## Quick Start

This guide walks through setting up the WhatsApp invoice notification system using Fonnte API.

## Prerequisites

- ✅ Fonnte account (https://fonnte.com)
- ✅ Supabase project
- ✅ DOKU payment gateway configured
- ✅ Database with whatsapp_messages table (migration: 20260513000000)

## Step 1: Get Fonnte API Token

### Option A: Create Free Fonnte Account

1. Go to https://fonnte.com
2. Click "Sign Up" → Fill in your details
3. Verify email
4. Login to dashboard

### Option B: Use Existing Account

1. Login to https://fonnte.com/dashboard
2. Skip to Step 2

## Step 2: Generate Fonnte API Token

1. Go to Dashboard → Settings → API
2. Under "API Token" section, copy your token:
   ```
   Token: xxxxx_xxxxx_xxxxx_xxxxx
   ```
3. Save this token (you'll need it in Step 3)

**Note:** Fonnte gives you:
- Free tier: 100 messages/month
- Paid tier: Usage-based pricing
- For testing: Use free tier

## Step 3: Add Token to Supabase Secrets

### Via Supabase CLI

```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Set the secret (replace YOUR_PROJECT_REF and YOUR_TOKEN)
supabase secrets set FONNTE_API_TOKEN="your_fonnte_token_here" \
  --project-ref your_project_ref

# Verify it's set
supabase secrets list --project-ref your_project_ref
```

### Via Supabase Dashboard

1. Go to Supabase Dashboard → Your Project
2. Navigate to **Settings** → **Edge Functions**
3. Scroll to **Secrets** section
4. Click **New Secret**
5. Fill in:
   - **Name:** `FONNTE_API_TOKEN`
   - **Value:** (paste your Fonnte token)
6. Click **Create Secret**
7. Wait for deployment (shows "✓" when ready)

### Via Docker/Local Dev

```bash
# In your .env.local file
FONNTE_API_TOKEN=your_fonnte_token_here

# Or export to shell
export FONNTE_API_TOKEN="your_fonnte_token_here"
```

## Step 4: Verify Database Setup

```sql
-- Check whatsapp_messages table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'whatsapp_messages';

-- Check if RLS is enabled
SELECT relname, (rowsecurity) 
FROM pg_class 
WHERE relname = 'whatsapp_messages';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'whatsapp_messages';
```

Expected output:
```
 table_name       | whatsapp_messages
 rowsecurity      | true
 index            | idx_whatsapp_messages_order_number (and others)
```

If table doesn't exist, run migration:
```bash
supabase migration up --project-ref your_project_ref
```

## Step 5: Deploy Edge Function

The `send-whatsapp-invoice` function is already created. Deploy it:

```bash
# Deploy the function
supabase functions deploy send-whatsapp-invoice \
  --project-ref your_project_ref

# Verify deployment
supabase functions list --project-ref your_project_ref
```

Output should show:
```
Name                           Status
send-whatsapp-invoice          ✓ (active)
```

## Step 6: Test the Setup

### Test 1: Send Test Message

```bash
# Get your project URL and key
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-anon-key"

# Send test invoice (use a real test order from your database)
curl -X POST \
  $SUPABASE_URL/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -d '{
    "orderNumber": "TKT-240513-ABC123",
    "orderType": "ticket",
    "forceSend": true
  }'
```

Expected response:
```json
{
  "status": "success",
  "message": "WhatsApp invoice sent successfully",
  "orderNumber": "TKT-240513-ABC123",
  "messageId": "fonnte_xxx"
}
```

### Test 2: Check Message in Database

```bash
# In Supabase SQL Editor
SELECT 
  order_number,
  customer_phone,
  delivery_status,
  error_message,
  sent_at
FROM whatsapp_messages
WHERE order_number = 'TKT-240513-ABC123'
ORDER BY created_at DESC
LIMIT 1;
```

### Test 3: Receive WhatsApp

1. Open WhatsApp on the test phone number
2. You should receive invoice message within 5 seconds:
   ```
   Halo [Name]!
   Booking kamu berhasil dengan invoice
   TKT-240513-ABC123
   ...
   ```

## Step 7: Integrate with Payment Webhook

The doku-webhook already calls the WhatsApp function automatically. To verify:

1. Make a test payment via DOKU
2. Complete payment
3. Check whatsapp_messages table for the sent message
4. Verify phone received the invoice

## Configuration Files

### Environment Variables Summary

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `FONNTE_API_TOKEN` | Your Fonnte API token | ✅ Yes | Set in Supabase Secrets |
| `WHATSAPP_INVOICE_ENABLED` | true/false | ❌ No | Default: true (if FONNTE_API_TOKEN set) |
| `WHATSAPP_LOG_LEVEL` | debug/info/warn/error | ❌ No | Default: info |

### Default Environment Variables (Already Set)

These should already be in your Supabase configuration:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
DOKU_CLIENT_ID=xxxxx
DOKU_SECRET_KEY=xxxxx
DOKU_IS_PRODUCTION=true
```

## File Structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   ├── fonnte.ts              ← WhatsApp via Fonnte helpers
│   │   ├── payment-effects.ts     ← Integration point
│   │   ├── env.ts                 ← Environment variable loading
│   │   └── ...
│   ├── send-whatsapp-invoice/
│   │   └── index.ts               ← Main WhatsApp function
│   ├── doku-webhook/
│   │   └── index.ts               ← Triggers WhatsApp send
│   └── ...
├── migrations/
│   └── 20260513000000_add_whatsapp_messages_table.sql  ← DB schema
└── ...

docs/runbooks/
├── whatsapp-invoice-notifications.md  ← Full documentation
├── whatsapp-api-examples.md           ← Code examples
├── whatsapp-env-setup.md              ← This file
└── ...
```

## Verification Checklist

- [ ] Fonnte account created
- [ ] API token obtained
- [ ] Token added to Supabase secrets
- [ ] `send-whatsapp-invoice` function deployed
- [ ] `whatsapp_messages` table exists
- [ ] Test message sent successfully
- [ ] WhatsApp message received
- [ ] Database entry created
- [ ] Error handling working (test with invalid phone)
- [ ] Duplicate prevention working

## Common Issues & Fixes

### Issue: "FONNTE_API_TOKEN not configured"

**Cause:** Environment variable not set properly

**Fix:**
```bash
# Verify token is set
supabase secrets list | grep FONNTE

# If not showing, set it again
supabase secrets set FONNTE_API_TOKEN="your_token" \
  --project-ref your_project_ref

# Restart functions (this usually happens automatically)
```

### Issue: "Customer phone number not found"

**Cause:** Profile doesn't have phone_number

**Fix:**
```sql
-- Check if profile has phone
SELECT id, phone_number FROM profiles LIMIT 5;

-- Update missing phone number
UPDATE profiles 
SET phone_number = '081234567890' 
WHERE id = 'user_uuid_here' 
AND phone_number IS NULL;
```

### Issue: "Invalid phone number format"

**Cause:** Phone number not in Indonesian format

**Fix:**
```
Fonnte accepts:
✅ 081234567890 (Indonesian, no +)
✅ 62812345678 (With country code 62)
✅ +62812345678 (International format)

The system auto-normalizes, but database should store:
✅ 08... or
✅ +62...
```

### Issue: Message not received after 5 minutes

**Cause:** Could be several reasons

**Debug steps:**
1. Check message status in database:
   ```sql
   SELECT delivery_status, error_message FROM whatsapp_messages
   WHERE order_number = 'TKT-XXX'
   ORDER BY created_at DESC LIMIT 1;
   ```

2. Check webhook logs:
   ```sql
   SELECT event_type, error_message FROM webhook_logs
   WHERE order_number = 'TKT-XXX'
   AND event_type LIKE '%whatsapp%'
   ORDER BY processed_at DESC;
   ```

3. Verify Fonnte token is still valid (check Fonnte dashboard)

4. Check phone number format:
   ```sql
   SELECT customer_phone FROM whatsapp_messages
   WHERE order_number = 'TKT-XXX' LIMIT 1;
   ```

### Issue: "Duplicate prevention blocking resend"

**Solution:** Use forceSend flag:
```bash
curl -X POST ... -d '{
  "orderNumber": "TKT-XXX",
  "forceSend": true
}'
```

## Performance Optimization

### For High Volume (1000+ messages/day)

1. Use Fonnte's paid plan
2. Batch send via scheduled function:
   ```bash
   supabase functions deploy send-pending-invoices \
     --project-ref your_project_ref
   ```

3. Set up cron schedule in Supabase

### Monitoring Queries

```sql
-- Daily stats
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN delivery_status = 'submitted' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed
FROM whatsapp_messages
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- Success rate by hour
SELECT 
  DATE_TRUNC('hour', sent_at) as hour,
  COUNT(*) as total,
  ROUND(100.0 * SUM(CASE WHEN delivery_status = 'submitted' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM whatsapp_messages
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', sent_at)
ORDER BY hour DESC;
```

## Disaster Recovery

### If Fonnte Token is Compromised

1. Revoke token in Fonnte dashboard
2. Generate new token
3. Update Supabase secret:
   ```bash
   supabase secrets set FONNTE_API_TOKEN="new_token" \
     --project-ref your_project_ref
   ```
4. Monitor whatsapp_messages for any unauthorized sends

### If Database Gets Corrupted

The system has idempotency built in. To re-sync:

```sql
-- Clear failed messages
DELETE FROM whatsapp_messages 
WHERE delivery_status = 'failed' 
AND created_at < NOW() - INTERVAL '7 days';

-- Check for orphaned records
SELECT COUNT(*) FROM whatsapp_messages 
WHERE order_id NOT IN (SELECT id FROM orders);
```

## Next Steps

1. ✅ Setup complete
2. Test with real payments
3. Monitor logs in first week
4. Optimize message timing if needed
5. Scale to production

## Support Resources

- **Fonnte Docs:** https://fonnte.com/api
- **Supabase Docs:** https://supabase.com/docs
- **DOKU Docs:** https://doku.com/docs
- **Local Logs:** Check Supabase function logs in dashboard

## Related Docs

- [WhatsApp Invoice Notifications](./whatsapp-invoice-notifications.md)
- [API Examples](./whatsapp-api-examples.md)
- [DOKU Payments Runbook](./doku-payments.md)
