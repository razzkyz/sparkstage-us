# Quick Commands Reference - SparkStage US

## 🚀 Initial Setup (One Time Only)

### 1. Copy Folder
```powershell
# Copy entire sparkstage folder to sparkstageus
Copy-Item -Recurse C:\SparkDoku\sparkstage C:\SparkDoku\sparkstageus
```

### 2. Run Setup Script
```powershell
cd C:\SparkDoku\sparkstage
.\scripts\setup-separate-us-folder.ps1
```

**OR Manual Setup:**
```powershell
cd C:\SparkDoku\sparkstageus

# Clean git
Remove-Item -Recurse -Force .git
git init

# Install dependencies
npm install
cd frontend
npm install
npm install @stripe/stripe-js @stripe/react-stripe-js
cd ..

# Create environment file
copy .env.us-example .env.local
notepad .env.local  # Edit with your credentials
```

### 3. Create Supabase Project
```
Go to: https://supabase.com/dashboard
Click: "New Project"
Name: sparkstage-us
Region: US West (Oregon)
```

### 4. Link to Supabase
```powershell
cd C:\SparkDoku\sparkstageus
supabase link --project-ref [YOUR-US-PROJECT-REF]
```

### 5. Setup Database
```powershell
# Push migrations
npm run supabase:db:push

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set PUBLIC_APP_URL=https://your-app.com
```

---

## 💻 Daily Development Commands

### Working with Indonesia Version
```powershell
# Navigate to Indonesia folder
cd C:\SparkDoku\sparkstage

# Start dev server (port 5173)
npm run dev

# Build
npm run build

# Database operations
npm run supabase:db:push
supabase migration new migration_name

# Deploy functions
supabase functions deploy
```

### Working with US Version
```powershell
# Navigate to US folder
cd C:\SparkDoku\sparkstageus

# Start dev server (port 5174 - DIFFERENT!)
npm run dev

# Build
npm run build

# Database operations (goes to US database!)
npm run supabase:db:push
supabase migration new migration_name

# Deploy functions (goes to US project!)
supabase functions deploy
```

---

## 🔄 Running Both Versions Simultaneously

```powershell
# Terminal 1 - Indonesia
cd C:\SparkDoku\sparkstage
npm run dev
# Opens: http://localhost:5173

# Terminal 2 - US
cd C:\SparkDoku\sparkstageus
npm run dev
# Opens: http://localhost:5174
```

---

## 📊 Database Commands

### Check Current Project
```powershell
supabase projects list
```

### Switch Between Projects
```powershell
# In Indonesia folder
cd C:\SparkDoku\sparkstage
supabase link --project-ref [INDONESIA-PROJECT-REF]

# In US folder
cd C:\SparkDoku\sparkstageus
supabase link --project-ref [US-PROJECT-REF]
```

### Create Migration
```powershell
# Indonesia
cd C:\SparkDoku\sparkstage
supabase migration new add_feature_name

# US
cd C:\SparkDoku\sparkstageus
supabase migration new add_feature_name
```

### Push Migrations
```powershell
# Indonesia
cd C:\SparkDoku\sparkstage
npm run supabase:db:push  # Or: supabase db push

# US
cd C:\SparkDoku\sparkstageus
npm run supabase:db:push  # Or: supabase db push
```

### Reset Local Database
```powershell
npm run supabase:db:reset
```

---

## 🚢 Deployment Commands

### Deploy Frontend (Vercel)

**Indonesia:**
```powershell
cd C:\SparkDoku\sparkstage\frontend
vercel deploy --prod
```

**US:**
```powershell
cd C:\SparkDoku\sparkstageus\frontend
vercel deploy --prod
```

### Deploy Edge Functions

**Indonesia:**
```powershell
cd C:\SparkDoku\sparkstage
supabase functions deploy
```

**US:**
```powershell
cd C:\SparkDoku\sparkstageus
supabase functions deploy
```

### Deploy Specific Function
```powershell
# Indonesia
supabase functions deploy create-doku-ticket-checkout

# US
supabase functions deploy create-stripe-ticket-checkout
```

---

## 🔐 Secrets Management

### Set Secrets

**Indonesia (DOKU):**
```powershell
cd C:\SparkDoku\sparkstage
supabase secrets set DOKU_CLIENT_ID=xxxxx
supabase secrets set DOKU_SECRET_KEY=xxxxx
supabase secrets set RAJAONGKIR_API_KEY=xxxxx
```

**US (Stripe):**
```powershell
cd C:\SparkDoku\sparkstageus
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set EASYPOST_API_KEY=EZAK...
```

### List Secrets
```powershell
supabase secrets list
```

### Delete Secret
```powershell
supabase secrets unset SECRET_NAME
```

---

## 🧪 Testing Commands

### Run Tests
```powershell
npm run test
```

### Test Stripe Webhook Locally
```powershell
# Terminal 1: Start dev server
cd C:\SparkDoku\sparkstageus
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Terminal 3: Trigger test event
stripe trigger payment_intent.succeeded
```

### Test DOKU Webhook Locally
```powershell
# Use ngrok or similar to expose local endpoint
ngrok http 54321
```

---

## 🛠️ Troubleshooting Commands

### Check Supabase Status
```powershell
supabase status
```

### Restart Local Supabase
```powershell
supabase stop
supabase start
```

### Check Which Project You're Linked To
```powershell
supabase projects list
# Look for the one marked with (*)
```

### View Function Logs
```powershell
# Real-time logs
supabase functions logs --tail

# Specific function
supabase functions logs create-stripe-ticket-checkout
```

### Database Connection String
```powershell
supabase db url
```

---

## 📦 Package Management

### Install New Package (Frontend)
```powershell
# Indonesia
cd C:\SparkDoku\sparkstage\frontend
npm install package-name

# US
cd C:\SparkDoku\sparkstageus\frontend
npm install package-name
```

### Update Dependencies
```powershell
# Check outdated
npm outdated

# Update all
npm update

# Update specific package
npm install package-name@latest
```

---

## 🔍 Useful Queries

### Check Environment Variables
```powershell
# Show all env vars starting with VITE_
Get-ChildItem Env: | Where-Object { $_.Name -like "VITE_*" }

# Or view .env.local
Get-Content .env.local
```

### Check Node/NPM Version
```powershell
node --version
npm --version
```

### Check Supabase CLI Version
```powershell
supabase --version
```

### Check Stripe CLI Version
```powershell
stripe --version
```

---

## 📁 File Operations

### View Migration Files
```powershell
# Indonesia
dir C:\SparkDoku\sparkstage\supabase\migrations

# US
dir C:\SparkDoku\sparkstageus\supabase\migrations
```

### Edit Migration
```powershell
notepad supabase\migrations\[TIMESTAMP]_migration_name.sql
```

### Edit Environment File
```powershell
# Indonesia
notepad C:\SparkDoku\sparkstage\.env.local

# US
notepad C:\SparkDoku\sparkstageus\.env.local
```

---

## 🎯 Quick Cheat Sheet

| Task | Indonesia Command | US Command |
|------|-------------------|------------|
| **Navigate** | `cd C:\SparkDoku\sparkstage` | `cd C:\SparkDoku\sparkstageus` |
| **Dev Server** | `npm run dev` (port 5173) | `npm run dev` (port 5174) |
| **Build** | `npm run build` | `npm run build` |
| **Push DB** | `npm run supabase:db:push` | `npm run supabase:db:push` |
| **Deploy** | `vercel deploy --prod` | `vercel deploy --prod` |
| **Functions** | `supabase functions deploy` | `supabase functions deploy` |
| **Secrets** | Uses DOKU keys | Uses Stripe keys |

---

## ⚠️ Important Notes

1. **Always check which folder you're in:**
   ```powershell
   pwd  # Shows current directory
   ```

2. **Make sure you're linked to correct Supabase project:**
   ```powershell
   supabase projects list
   ```

3. **Environment files are DIFFERENT per folder:**
   - `sparkstage\.env.local` = DOKU credentials
   - `sparkstageus\.env.local` = Stripe credentials

4. **Ports are DIFFERENT:**
   - Indonesia: 5173
   - US: 5174

5. **Git repositories are SEPARATE:**
   - Each folder has its own `.git` directory
   - Commit changes independently

---

## 🆘 Emergency Commands

### Reset Everything (Use with Caution!)
```powershell
# Stop all services
supabase stop

# Clean node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force frontend\node_modules

# Reinstall
npm install
cd frontend
npm install
cd ..

# Restart
supabase start
npm run dev
```

### Force Git Reset
```powershell
Remove-Item -Recurse -Force .git
git init
git branch -M main
```

### Unlink Supabase Project
```powershell
supabase unlink
```

---

## 📚 More Help

- Detailed guide: `SEPARATE_FOLDER_SETUP.md`
- Indonesian guide: `QUICKSTART_ID.md`
- Database strategy: `DATABASE_STRATEGY.md`
- Architecture: `ARCHITECTURE.md`
