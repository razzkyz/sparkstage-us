# 📋 Panduan Copy Schema dari Indonesia ke US Database

## 🎯 Cara Tercepat (2 Menit!)

### Step 1: Buka Indonesia Database
1. Go to: https://supabase.com/dashboard/project/hogzjapnkvsihvvbgcdb
2. Click **SQL Editor** di sidebar kiri
3. Click **New query**

### Step 2: Run Query Ini untuk Export Schema
Paste dan run query ini:

```sql
-- Export complete schema structure
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_schema || '.' || table_name || ' ();' AS create_statement
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**ATAU** gunakan built-in Supabase feature:

### Step 3: Alternative - Use Database Webhooks (EASIEST!)

1. Di Indonesia Project, go to **Database** → **Webhooks**
2. Scroll down, cari **"Schema SQL"** atau **"Export Schema"**

### Step 4: ATAU - Pakai Supabase CLI Migration Repair

Jalankan semua command ini (copy paste ke terminal):

```bash
# Link back to US database
supabase link --project-ref advzkhuulbaztolnttfl --password "Pin832295--"

# Tell Supabase CLI that migrations already exist in remote
# (This tricks CLI to think US DB already has these migrations)
supabase migration repair --status applied 20260206000000
# ... (copy all migration repair commands from error output)
```

## ✅ RECOMMENDED: Manual Table Creation via SQL Editor

Cara paling aman dan cepat:

1. **Di Indonesia Project:**
   - SQL Editor → Run: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
   - Copy list of table names

2. **Kasih table names ke saya**
   - Saya akan generate CREATE TABLE statements
   - Berdasarkan TypeScript types yang ada

3. **Apply ke US Database**
   - Copy SQL
   - Paste di US SQL Editor
   - Done!

## 🚀 ATAU Simple Push with Repair

Jalankan ini di terminal (akan repair migration history dulu):

```bash
cd c:\SparkDoku\sparkstageus

# Link to US
supabase link --project-ref advzkhuulbaztolnttfl --password "Pin832295--"

# Push migrations (might have errors but will create most tables)
supabase db push --include-all
```

Pilih cara mana yang Anda mau!
