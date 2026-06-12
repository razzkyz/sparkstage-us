# NPM Commands - WhatsApp Invoice System

Semua command yang digunakan untuk deploy dan manage WhatsApp invoice system.

## 📦 Database Commands

### Deploy Database Migrations

```bash
# Deploy semua database migrations (termasuk whatsapp_messages table)
npm run supabase:db:push

# List semua migrations yang sudah applied
npm run supabase:db:list

# Reset database (⚠️ WARNING: Hapus semua data lokal!)
npm run supabase:db:reset
```

**Output example:**
```
✓ Pushing migrations...
  Applying migration 20260513000000_add_whatsapp_messages_table.sql...
  Applying migration 20260513000001_add_whatsapp_rls_policies.sql...
✓ Success!
```

---

## 🚀 Deploy Functions

### Deploy Individual Functions

```bash
# Deploy WhatsApp invoice function (NEW)
npm run supabase:functions:deploy:send-whatsapp-invoice

# Deploy updated DOKU webhook (dengan WhatsApp integration)
npm run supabase:functions:deploy:doku-webhook

# Deploy semua payment functions
npm run supabase:functions:deploy:all
```

### Deploy Other Payment Functions (As Reference)

```bash
# Ticket checkout
npm run supabase:functions:deploy:create-doku-ticket-checkout

# Product checkout
npm run supabase:functions:deploy:create-doku-product-checkout

# Status sync
npm run supabase:functions:deploy:sync-doku-ticket-status
npm run supabase:functions:deploy:sync-doku-product-status

# Complete product pickup
npm run supabase:functions:deploy:complete-product-pickup

# Reconciliation
npm run supabase:functions:deploy:reconcile-doku-payments
```

---

## 🔑 Environment Variables

### Set Fonnte API Token

```bash
# Set FONNTE_API_TOKEN environment variable
npm run supabase:secrets:set FONNTE_API_TOKEN="your_fonnte_token_here"

# List semua secrets yang sudah set
npm run supabase:secrets:list
```

**Full example:**
```bash
npm run supabase:secrets:set FONNTE_API_TOKEN="xxx_abc_123_def_456"
# Output: ✓ Secret 'FONNTE_API_TOKEN' created successfully

npm run supabase:secrets:list
# Output:
# Name                  | Created At
# FONNTE_API_TOKEN     | 2026-05-13 10:00:00
```

---

## 🧪 Local Development

### Start Supabase Locally

```bash
# Start Supabase containers (PostgreSQL, Auth, Functions, etc)
npm run supabase:start

# Check status of running Supabase
npm run supabase:status

# Stop Supabase
npm run supabase:stop
```

**Output example:**
```
Supabase started successfully.

API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54321/postgres
Studio URL: http://localhost:54321
...
```

### Serve Edge Functions Locally

```bash
# Start serving Edge Functions locally (di port 54321)
npm run supabase:functions:serve

# Sekarang bisa test di http://localhost:54321/functions/v1/send-whatsapp-invoice
```

**Dalam terminal lain, test:**
```bash
curl -X POST http://localhost:54321/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -d '{"orderNumber": "TKT-240513-TEST"}'
```

---

## 📊 Monitoring & Logs

### View Function Logs

```bash
# View logs untuk send-whatsapp-invoice function
npm run supabase:functions:logs -- send-whatsapp-invoice

# Real-time tail logs (follow mode)
supabase functions logs send-whatsapp-invoice --tail

# Last 100 lines
supabase functions logs send-whatsapp-invoice --limit 100
```

### Logs untuk doku-webhook

```bash
# Check webhook processing logs
supabase functions logs doku-webhook --tail

# See recent webhook executions
supabase functions logs doku-webhook --limit 50
```

---

## 🎯 Complete Deployment Workflow

Ini adalah urutan command yang harus dijalankan untuk deploy WhatsApp system ke production:

### Step 1: Database & Environment

```bash
# 1.1 Deploy database migrations
npm run supabase:db:push

# 1.2 Verify database created
npm run supabase:db:list
# Harus ada: 20260513000000_add_whatsapp_messages_table.sql
# Harus ada: 20260513000001_add_whatsapp_rls_policies.sql

# 1.3 Set Fonnte token
npm run supabase:secrets:set FONNTE_API_TOKEN="your_token_here"

# 1.4 Verify token is set
npm run supabase:secrets:list
```

### Step 2: Deploy Functions

```bash
# 2.1 Deploy WhatsApp function
npm run supabase:functions:deploy:send-whatsapp-invoice

# 2.2 Deploy updated webhook
npm run supabase:functions:deploy:doku-webhook

# Or deploy all at once:
npm run supabase:functions:deploy:all
```

### Step 3: Verify Deployment

```bash
# 3.1 Check if functions deployed
supabase functions list

# Should show:
# Name                        | Status
# send-whatsapp-invoice       | ✓ (active)
# doku-webhook                | ✓ (active)

# 3.2 Check if secrets available
npm run supabase:secrets:list
# Should show: FONNTE_API_TOKEN

# 3.3 Check logs for errors
supabase functions logs doku-webhook --limit 20
supabase functions logs send-whatsapp-invoice --limit 20
```

### Step 4: Test

```bash
# 4.1 Make a test payment (via DOKU)
# Atau trigger manual test:
curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -d '{"orderNumber": "TKT-240513-TEST", "forceSend": true}'

# 4.2 Check logs for errors
supabase functions logs send-whatsapp-invoice --tail

# 4.3 Verify message in database (via Supabase Dashboard SQL)
SELECT * FROM whatsapp_messages WHERE order_number = 'TKT-240513-TEST';
```

---

## 🔄 After Code Changes

Ketika edit code di functions, redeploy dengan:

```bash
# If you edited doku-webhook/index.ts
npm run supabase:functions:deploy:doku-webhook

# If you edited send-whatsapp-invoice/index.ts
npm run supabase:functions:deploy:send-whatsapp-invoice

# Or deploy both:
npm run supabase:functions:deploy:all
```

---

## 🆘 Troubleshooting Commands

### Debug migration issues

```bash
# List applied migrations
npm run supabase:db:list

# Check if whatsapp_messages table exists
# Via Supabase Dashboard SQL Editor:
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'whatsapp_messages';

# Reset (⚠️ Deletes data!)
npm run supabase:db:reset
npm run supabase:db:push
```

### Debug function deployment

```bash
# Check function status
supabase functions list

# View function details
supabase functions list -v

# Check specific function logs
supabase functions logs send-whatsapp-invoice --tail

# Redeploy function
npm run supabase:functions:deploy:send-whatsapp-invoice
```

### Debug secrets/environment

```bash
# List all secrets
npm run supabase:secrets:list

# If FONNTE_API_TOKEN missing:
npm run supabase:secrets:set FONNTE_API_TOKEN="your_token"

# Redeploy function to pick up secret
npm run supabase:functions:deploy:doku-webhook
```

---

## 📝 Full Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `npm run supabase:db:push` | Deploy database migrations | `npm run supabase:db:push` |
| `npm run supabase:db:list` | List applied migrations | `npm run supabase:db:list` |
| `npm run supabase:db:reset` | Reset database (⚠️ deletes data) | `npm run supabase:db:reset` |
| `npm run supabase:functions:deploy:send-whatsapp-invoice` | Deploy WhatsApp function | `npm run supabase:functions:deploy:send-whatsapp-invoice` |
| `npm run supabase:functions:deploy:doku-webhook` | Deploy webhook | `npm run supabase:functions:deploy:doku-webhook` |
| `npm run supabase:functions:deploy:all` | Deploy all functions | `npm run supabase:functions:deploy:all` |
| `npm run supabase:functions:serve` | Serve functions locally | `npm run supabase:functions:serve` |
| `npm run supabase:secrets:set` | Set environment variable | `npm run supabase:secrets:set KEY="value"` |
| `npm run supabase:secrets:list` | List all secrets | `npm run supabase:secrets:list` |
| `npm run supabase:start` | Start Supabase locally | `npm run supabase:start` |
| `npm run supabase:stop` | Stop Supabase | `npm run supabase:stop` |
| `npm run supabase:status` | Check status | `npm run supabase:status` |

---

## 🎬 Copy-Paste Scripts

### Script 1: First Time Setup

```bash
#!/bin/bash
# Copy-paste this and save as: setup-whatsapp.sh
# Then run: bash setup-whatsapp.sh

set -e

echo "🚀 Setting up WhatsApp Invoice System..."
echo ""

read -p "Enter your Fonnte API token: " FONNTE_TOKEN
read -p "Enter your Supabase project ref: " PROJECT_REF

echo ""
echo "📦 Step 1: Deploying database..."
npm run supabase:db:push

echo ""
echo "🔑 Step 2: Setting Fonnte token..."
npm run supabase:secrets:set FONNTE_API_TOKEN="$FONNTE_TOKEN"

echo ""
echo "⚙️  Step 3: Deploying functions..."
npm run supabase:functions:deploy:send-whatsapp-invoice
npm run supabase:functions:deploy:doku-webhook

echo ""
echo "✅ Setup complete!"
echo ""
echo "Verify with:"
echo "  npm run supabase:secrets:list"
echo "  supabase functions list"
```

Save as `setup-whatsapp.sh` and run:
```bash
chmod +x setup-whatsapp.sh
./setup-whatsapp.sh
```

### Script 2: Redeploy After Code Changes

```bash
#!/bin/bash
# Copy-paste this and save as: redeploy.sh
# Then run: bash redeploy.sh

set -e

echo "🔄 Redeploying functions..."

npm run supabase:functions:deploy:send-whatsapp-invoice
npm run supabase:functions:deploy:doku-webhook

echo ""
echo "✅ Functions redeployed!"
echo ""
echo "Check logs with:"
echo "  supabase functions logs send-whatsapp-invoice --tail"
echo "  supabase functions logs doku-webhook --tail"
```

Save as `redeploy.sh` and run:
```bash
chmod +x redeploy.sh
./redeploy.sh
```

### Script 3: Check Everything

```bash
#!/bin/bash
# Copy-paste this and save as: check-status.sh
# Then run: bash check-status.sh

echo "🔍 Checking WhatsApp Invoice System Status..."
echo ""

echo "1️⃣  Database Migrations:"
npm run supabase:db:list | grep whatsapp || echo "❌ WhatsApp migrations not found"

echo ""
echo "2️⃣  Deployed Functions:"
supabase functions list | grep -E 'send-whatsapp|doku-webhook' || echo "❌ Functions not found"

echo ""
echo "3️⃣  Environment Secrets:"
npm run supabase:secrets:list | grep FONNTE || echo "❌ FONNTE_API_TOKEN not set"

echo ""
echo "4️⃣  Recent Logs (doku-webhook):"
supabase functions logs doku-webhook --limit 5

echo ""
echo "✅ Status check complete!"
```

Save as `check-status.sh` and run:
```bash
chmod +x check-status.sh
./check-status.sh
```

---

## 📚 Documentation Files

Untuk penjelasan lebih detail, lihat:

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Step-by-step deployment guide
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - Quick copy-paste commands
- **[WHATSAPP_README.md](./WHATSAPP_README.md)** - Complete feature guide
- **[whatsapp-api-examples.md](./whatsapp-api-examples.md)** - Code examples

---

**Version:** 1.0  
**Last Updated:** May 13, 2026  
**Status:** ✅ Ready to Use
