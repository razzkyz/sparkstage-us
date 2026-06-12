# Deployment Guide - WhatsApp Invoice System

## 📦 Alur Deployment

```
1. Setup Database (Migration)
2. Set Environment Variables (Fonnte Token)
3. Deploy Edge Functions
4. Test Webhook
5. Monitor & Verify
```

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Environment

```bash
# Go to project root
cd /path/to/sparkstage

# Install dependencies if not yet
npm install

# Verify Supabase CLI is installed
supabase --version
```

### Step 2: Get Fonnte API Token

1. Visit https://fonnte.com
2. Sign up or login to dashboard
3. Go to **Settings → API**
4. Copy your **API token**
5. Save for Step 4

### Step 3: Deploy Database Migration

The `whatsapp_messages` table will be created with this command:

```bash
# From project root
supabase db push

# Or explicitly push migrations
npx supabase db push --project-ref your_project_ref
```

**What this does:**
- Creates `whatsapp_messages` table
- Creates indexes for efficient querying
- Enables RLS (Row Level Security)
- Creates policies for users & service role
- Creates auto-update trigger for `updated_at`

**Verify migration:**
```bash
# Check applied migrations
supabase migration list

# Or query in Supabase Dashboard SQL Editor:
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'whatsapp_messages';
```

### Step 4: Set Environment Variables

**Via Supabase CLI:**

```bash
# Get your project reference from Supabase Dashboard
# Settings → General → Project URL contains the project ref

supabase secrets set FONNTE_API_TOKEN="your_fonnte_token_here" \
  --project-ref your_project_ref
```

**Example:**
```bash
supabase secrets set FONNTE_API_TOKEN="xxx_abc_123_def" \
  --project-ref abc123def456
```

**Via Supabase Dashboard (Alternative):**
1. Go to your Supabase project
2. Navigate to **Settings → Edge Functions**
3. Scroll to **Secrets** section
4. Click **New Secret**
5. Fill in:
   - **Name:** `FONNTE_API_TOKEN`
   - **Value:** (paste your Fonnte token)
6. Click **Create Secret**

**Verify token is set:**
```bash
supabase secrets list --project-ref your_project_ref

# Should show:
# Name                   | Created At
# FONNTE_API_TOKEN      | 2026-05-13 10:00:00
```

### Step 5: Deploy Edge Functions

```bash
# Deploy send-whatsapp-invoice function
supabase functions deploy send-whatsapp-invoice \
  --project-ref your_project_ref

# Deploy doku-webhook with updated code
supabase functions deploy doku-webhook \
  --project-ref your_project_ref
```

**Verify deployment:**
```bash
# List all deployed functions
supabase functions list --project-ref your_project_ref

# Should show:
# Name                        | Status
# send-whatsapp-invoice       | ✓ (active)
# doku-webhook                | ✓ (active)
```

### Step 6: Local Testing (Optional)

**For development/testing locally:**

```bash
# Start Supabase local development server
supabase start

# Or if already running
supabase status

# Get local endpoint (typically http://localhost:54321)
```

**Run Edge Functions locally:**
```bash
# In separate terminal
supabase functions serve

# Test send-whatsapp-invoice locally
curl -X POST http://localhost:54321/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"orderNumber": "TKT-240513-TEST"}'
```

### Step 7: Test in Production

```bash
# After deployment, test with real order

# Get your Supabase project details
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="eyJ... (your anon key)"
export ORDER_NUMBER="TKT-240513-ABC123"

# Test send invoice
curl -X POST $SUPABASE_URL/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{\"orderNumber\": \"$ORDER_NUMBER\", \"forceSend\": true}"

# Response should be:
# {
#   "status": "success",
#   "message": "WhatsApp invoice sent successfully",
#   "orderNumber": "TKT-240513-ABC123",
#   "messageId": "fonnte_xxx"
# }
```

### Step 8: Verify in Database

```bash
# Check messages were logged
# Via Supabase Dashboard → SQL Editor

SELECT 
  order_number,
  customer_phone,
  delivery_status,
  error_message,
  sent_at
FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 10;

# Or via CLI (using psql)
supabase db execute << EOF
SELECT order_number, delivery_status, error_message FROM whatsapp_messages 
ORDER BY created_at DESC LIMIT 5;
EOF
```

## 📋 Complete Deployment Commands (Copy-Paste)

### For Production

```bash
#!/bin/bash
# Save this as deploy.sh and run: bash deploy.sh

PROJECT_REF="your_project_ref"
FONNTE_TOKEN="your_fonnte_token"

echo "🚀 Deploying WhatsApp Invoice System..."

# 1. Push database migrations
echo "📦 Deploying database migrations..."
npx supabase db push --project-ref $PROJECT_REF

# 2. Set environment variables
echo "🔑 Setting FONNTE_API_TOKEN..."
npx supabase secrets set FONNTE_API_TOKEN="$FONNTE_TOKEN" \
  --project-ref $PROJECT_REF

# 3. Deploy functions
echo "⚙️ Deploying functions..."
npx supabase functions deploy send-whatsapp-invoice \
  --project-ref $PROJECT_REF
npx supabase functions deploy doku-webhook \
  --project-ref $PROJECT_REF

# 4. Verify
echo "✅ Deployment complete!"
npx supabase functions list --project-ref $PROJECT_REF
npx supabase secrets list --project-ref $PROJECT_REF
```

**Run it:**
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🛠️ Common npm Commands

### Development

```bash
# Start local dev server
npm run dev

# Build frontend
npm run build

# Run linting
npm run lint

# Run tests
npm run test

# Run vitest in watch mode
npm run test:watch
```

### Supabase Commands

```bash
# Start local Supabase
npm run supabase:start
# Or: supabase start

# Stop local Supabase
npm run supabase:stop
# Or: supabase stop

# Push migrations to local
npm run supabase:db:push
# Or: supabase db push

# Generate types from database
npm run supabase:gen-types
# Or: supabase gen types typescript

# Run Edge Functions locally
npm run supabase:functions:serve
# Or: supabase functions serve

# Deploy functions
npm run supabase:functions:deploy send-whatsapp-invoice
npm run supabase:functions:deploy doku-webhook

# Check status
npm run supabase:status
# Or: supabase status

# Set secrets
npm run supabase:secrets:set FONNTE_API_TOKEN="your_token"
# Or: supabase secrets set FONNTE_API_TOKEN="your_token"

# List secrets
npm run supabase:secrets:list
# Or: supabase secrets list
```

### Database Commands

```bash
# Create new migration
npm run supabase:migration:create "add_whatsapp_messages"
# Or: supabase migration new add_whatsapp_messages

# List migrations
supabase migration list

# Rollback (undo last migration)
supabase db reset

# Execute raw SQL
supabase db execute --file migration.sql

# Open SQL editor
supabase sql
```

## 📝 Deployment Checklist

- [ ] Fonnte account created
- [ ] API token obtained
- [ ] Project ref noted (from Supabase Dashboard)
- [ ] Environment ready (Node.js, npm installed)
- [ ] Database migrations pushed (`npm run supabase:db:push`)
- [ ] FONNTE_API_TOKEN set in secrets (`supabase secrets set ...`)
- [ ] send-whatsapp-invoice deployed
- [ ] doku-webhook deployed
- [ ] Functions verified (`supabase functions list`)
- [ ] Test payment made
- [ ] WhatsApp message received
- [ ] Database entry verified
- [ ] Error logs checked

## 🔄 Update Deployment (After Code Changes)

When you modify the functions, redeploy with:

```bash
# Redeploy doku-webhook with WhatsApp integration
npm run supabase:functions:deploy doku-webhook

# Or directly
supabase functions deploy doku-webhook --project-ref your_project_ref
```

## 🆘 Troubleshooting Deployment

### Migration Failed

```bash
# Check migration status
supabase migration list

# Reset and reapply (WARNING: deletes local data)
supabase db reset

# Or just push without resetting
supabase db push --dry-run  # See what would change
supabase db push --no-verify  # Force push
```

### Functions Not Deploying

```bash
# Check for TypeScript errors
npm run lint

# Verbose deployment
supabase functions deploy send-whatsapp-invoice --debug

# Check function logs
supabase functions logs send-whatsapp-invoice
```

### Secrets Not Working

```bash
# Verify secret is set
supabase secrets list

# Resync secrets (restart functions)
supabase functions deploy doku-webhook --project-ref your_project_ref

# Or manually restart functions in Supabase Dashboard
```

### FONNTE_API_TOKEN Not Found

```bash
# Make sure token is set
supabase secrets set FONNTE_API_TOKEN="your_token" \
  --project-ref your_project_ref

# Verify it shows up
supabase secrets list

# If still not working, check function logs
supabase functions logs send-whatsapp-invoice
```

## 📊 Monitor Deployment

### Check Function Logs

```bash
# Watch real-time logs
supabase functions logs send-whatsapp-invoice --tail

# Or doku-webhook
supabase functions logs doku-webhook --tail

# Get last 100 lines
supabase functions logs send-whatsapp-invoice --limit 100
```

### Query Database

```bash
# Via Supabase Dashboard SQL Editor or CLI

# Check whatsapp_messages
SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 20;

# Check webhook logs
SELECT * FROM webhook_logs WHERE event_type LIKE '%whatsapp%' ORDER BY processed_at DESC;

# Count success rate
SELECT 
  delivery_status,
  COUNT(*) as count
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY delivery_status;
```

## 🎯 Next Steps After Deployment

1. **Monitor first 24 hours** - Watch for errors in logs
2. **Test with real payments** - Verify WhatsApp actually sends
3. **Set up alerts** - Get notified of failures
4. **Document in team** - Share deployment runbook
5. **Update DOKU webhook URL** - If changed (usually not needed)

## 📚 Related Documentation

- [WhatsApp Invoice Notifications Complete Guide](./WHATSAPP_README.md)
- [API Examples](./whatsapp-api-examples.md)
- [Environment Setup](./whatsapp-env-setup.md)
- [DOKU Payments](./doku-payments.md)

---

**Version:** 1.0  
**Last Updated:** May 13, 2026  
**Status:** ✅ Ready for Production
