# Quick Deploy Commands - WhatsApp Invoice System

## ⚡ Quick Reference (Copy-Paste Ready)

### 1️⃣ Deploy Database & Environment

```bash
# Push database migrations
npm run supabase:db:push
# or: supabase db push

# Set Fonnte API token
supabase secrets set FONNTE_API_TOKEN="your_token_here" \
  --project-ref your_project_ref

# Verify token is set
supabase secrets list
```

### 2️⃣ Deploy Edge Functions

```bash
# Deploy WhatsApp invoice function
supabase functions deploy send-whatsapp-invoice \
  --project-ref your_project_ref

# Deploy updated webhook with WhatsApp integration
supabase functions deploy doku-webhook \
  --project-ref your_project_ref

# Verify deployment
supabase functions list
```

### 3️⃣ Quick Test

```bash
# Get your project URL & key first
# Then test sending invoice

curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "orderNumber": "TKT-240513-ABC123",
    "forceSend": true
  }'
```

### 4️⃣ Check Database

```bash
# Open Supabase SQL Editor and run:
SELECT order_number, delivery_status, sent_at 
FROM whatsapp_messages 
ORDER BY created_at DESC LIMIT 10;
```

---

## 📋 Common Workflows

### New Payment / Trigger WhatsApp

```bash
# Automatic: Payment via DOKU → Webhook → WhatsApp
# No manual action needed!

# Manual trigger (for testing):
curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -d '{"orderNumber": "TKT-xxx"}'
```

### Local Development

```bash
# Start local Supabase
supabase start

# Serve Edge Functions locally
supabase functions serve

# In another terminal, test:
curl -X POST http://localhost:54321/functions/v1/send-whatsapp-invoice \
  -d '{"orderNumber": "TKT-TEST"}'
```

### Redeploy After Code Changes

```bash
# After editing doku-webhook/index.ts
supabase functions deploy doku-webhook

# After editing send-whatsapp-invoice/index.ts
supabase functions deploy send-whatsapp-invoice
```

### Monitor Logs

```bash
# Real-time webhook logs
supabase functions logs doku-webhook --tail

# Real-time WhatsApp function logs
supabase functions logs send-whatsapp-invoice --tail

# Last 100 lines
supabase functions logs send-whatsapp-invoice --limit 100
```

### Check Function Status

```bash
# List all functions
supabase functions list

# See function details
supabase functions list --project-ref your_project_ref

# Get function logs with timestamps
supabase functions logs send-whatsapp-invoice
```

### Reset Everything (Development Only)

```bash
# ⚠️ WARNING: Deletes all local data!
supabase db reset

# Recreates all tables from migrations
npm run supabase:db:push
```

---

## 🎯 Step-by-Step Copy-Paste (First Time Setup)

### Prerequisites
```bash
# Make sure you have:
# - Node.js 16+ installed
# - Fonnte account with API token
# - Supabase project created

# Install Supabase CLI if needed
npm install -g supabase

# Or use npx (no install needed)
npx supabase --version
```

### The 5-Minute Deploy

```bash
# 1. Get your project info
# From Supabase Dashboard URL: https://app.supabase.co/project/[PROJECT_REF]/...
export PROJECT_REF="your_project_ref_here"
export FONNTE_TOKEN="your_fonnte_token_here"

# 2. Deploy database
supabase db push --project-ref $PROJECT_REF

# 3. Set token
supabase secrets set FONNTE_API_TOKEN="$FONNTE_TOKEN" \
  --project-ref $PROJECT_REF

# 4. Deploy functions
supabase functions deploy send-whatsapp-invoice --project-ref $PROJECT_REF
supabase functions deploy doku-webhook --project-ref $PROJECT_REF

# 5. Verify
echo "✅ Checking deployment..."
supabase functions list --project-ref $PROJECT_REF
supabase secrets list --project-ref $PROJECT_REF

echo "🎉 Done! Your WhatsApp invoice system is live!"
```

---

## 🧪 Testing Checklist

```bash
# ☑️ Test 1: Function is deployed
supabase functions list | grep send-whatsapp-invoice

# ☑️ Test 2: Token is set
supabase secrets list | grep FONNTE_API_TOKEN

# ☑️ Test 3: Database table exists
# Via SQL Editor or:
supabase db execute --file - <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'whatsapp_messages';
EOF

# ☑️ Test 4: Send test message
curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -d '{"orderNumber": "TKT-240513-TEST"}'

# ☑️ Test 5: Check database
# Via SQL Editor:
SELECT * FROM whatsapp_messages WHERE order_number LIKE 'TKT-240513-TEST' LIMIT 1;
```

---

## 🆘 Troubleshooting Quick Fixes

### "FONNTE_API_TOKEN not configured"

```bash
# 1. Check if token is set
supabase secrets list

# 2. If not showing, set it again
supabase secrets set FONNTE_API_TOKEN="your_token" \
  --project-ref your_project_ref

# 3. Redeploy function to pick up secret
supabase functions deploy doku-webhook
```

### "Function returns 500 error"

```bash
# 1. Check logs
supabase functions logs send-whatsapp-invoice --tail

# 2. If showing "Order not found", verify order exists
# Via SQL: SELECT * FROM orders WHERE order_number = 'TKT-xxx';

# 3. Redeploy
supabase functions deploy send-whatsapp-invoice
```

### "WhatsApp not received"

```bash
# 1. Check delivery status in database
SELECT delivery_status, error_message FROM whatsapp_messages 
WHERE order_number = 'TKT-xxx' LIMIT 1;

# 2. If "failed", check error_message
# 3. If "skipped", check webhook logs
SELECT * FROM webhook_logs WHERE order_number = 'TKT-xxx' 
ORDER BY processed_at DESC LIMIT 5;

# 4. Force resend if needed
curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-invoice \
  -d '{"orderNumber": "TKT-xxx", "forceSend": true}'
```

### "Migration failed"

```bash
# 1. Check migration status
supabase migration list

# 2. If local issue, reset
supabase db reset

# 3. Reapply migrations
supabase db push

# 4. If production issue, check Supabase Dashboard → Migrations
```

---

## 📚 Documentation Links

- **[Full Deployment Guide](./DEPLOYMENT.md)** - Complete step-by-step
- **[WhatsApp Complete Guide](./WHATSAPP_README.md)** - All features
- **[API Examples](./whatsapp-api-examples.md)** - Code snippets
- **[DOKU Payments](./doku-payments.md)** - Payment setup

---

## 🚀 You're All Set!

After these commands run successfully:
1. ✅ Database is ready
2. ✅ Functions are deployed
3. ✅ Webhook is configured
4. ✅ WhatsApp invoices auto-send after payment

**No further manual steps needed!** The system will automatically send WhatsApp invoices when DOKU payment webhook is received.

---

**Pro Tip:** Save these commands to a bash script for easy re-deployment after code changes.

```bash
#!/bin/bash
# save-as: deploy.sh

PROJECT_REF="your_project_ref"

supabase db push --project-ref $PROJECT_REF
supabase functions deploy send-whatsapp-invoice --project-ref $PROJECT_REF
supabase functions deploy doku-webhook --project-ref $PROJECT_REF

echo "✅ Deployed!"
```

Run with: `bash deploy.sh`
