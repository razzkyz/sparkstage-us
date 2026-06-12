# WhatsApp Integration - Step-by-Step Setup

## ⚠️ PENTING: Cara Push Migration dengan Aman

### **Option 1: Push HANYA Migration WhatsApp (Recommended)**

**Step 1: Check migration status**
```bash
npm run supabase:db:list
```

Anda akan lihat list migrations. Yang baru adalah:
```
20260513000000_add_whatsapp_messages_table.sql    (baru, belum di-push)
```

**Step 2: Push migration spesifik menggunakan Supabase CLI**
```bash
supabase db push --include-migrations "20260513000000"
```

Atau menggunakan path lengkap:
```bash
supabase db push supabase/migrations/20260513000000_add_whatsapp_messages_table.sql
```

**Output yang diharapkan:**
```
✓ Executing migration...
✓ Creating table whatsapp_messages
✓ Creating indexes
✓ Creating trigger
```

---

### **Option 2: Push Semua (Tidak Recommended jika ada pending migrations)**

```bash
npm run supabase:db:push
```

⚠️ **HATI-HATI:** Ini akan push SEMUA migration yang belum di-push. Kalau ada migration lain yang belum selesai, bisa menyebabkan conflict.

---

## Update Package.json Scripts (Optional)

Untuk membuat lebih mudah, tambahkan script baru ke `package.json`:

```json
{
  "scripts": {
    "supabase:db:push:whatsapp": "supabase db push supabase/migrations/20260513000000_add_whatsapp_messages_table.sql",
    "supabase:db:list": "supabase migration list",
    "supabase:db:push": "supabase db push",
    "supabase:db:reset": "supabase db reset"
  }
}
```

Setelah ditambah, tinggal run:
```bash
npm run supabase:db:push:whatsapp
```

---

## Verify Migration di Supabase Dashboard

**Setelah push, verifikasi table sudah ada:**

1. Go to **Supabase Dashboard** → **Database** → **Tables**
2. Cari table `whatsapp_messages`
3. Lihat struktur columns:
   - ✅ `id`, `order_id`, `order_number`
   - ✅ `customer_phone`, `customer_name`
   - ✅ `template_id`, `params`
   - ✅ `doku_message_id`, `provider_status`
   - ✅ `delivery_status`, `error_message`

---

## WhatsApp Functions Status

### Tidak Perlu Deploy Standalone Function

✅ **WhatsApp sending code sudah di-integrate:**
- Lokasi: `supabase/functions/_shared/whatsapp.ts`
- Dijalankan oleh: `supabase/functions/_shared/payment-effects.ts`
- Trigger: Otomatis saat payment → paid

### Tidak perlu:
```bash
# Tidak perlu ini - function WhatsApp sudah integrated
supabase functions deploy send-whatsapp-ticket
```

---

## Environment Variables Setup

### Di Supabase Dashboard

**Project Settings** → **Edge Functions** → **Environment variables**

Tambahkan:
```
DOKU_WHATSAPP_ENABLED=true
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-240223-07652
DOKU_IS_PRODUCTION=true
```

### Local Development (jika testing)

File `.env.local`:
```
DOKU_WHATSAPP_ENABLED=true
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-SANDBOX-XXXXX
DOKU_IS_PRODUCTION=false
```

---

## Testing WhatsApp Integration

### 1. Verify Database Table
```bash
npm run supabase:db:list
# Atau di Dashboard → Tables → whatsapp_messages
```

### 2. Check Logs After Payment
```bash
# Di Supabase Dashboard:
# Functions → View all functions → Select doku-webhook
# Lihat Logs tab, cari "[sendTicketNotifications]"
```

### 3. Query WhatsApp Messages Sent
```sql
-- Di Supabase SQL Editor
SELECT 
  id,
  order_number,
  customer_phone,
  delivery_status,
  error_message,
  sent_at
FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 10;
```

---

## Rollback (jika ada error)

### Step 1: Check current status
```bash
npm run supabase:db:list
```

### Step 2: Reset to previous migration (jika ada error)
```bash
# Hanya reset local, tidak affect production
supabase db reset
```

### Step 3: Fix migration, then push again
```bash
# Edit migration file, then:
npm run supabase:db:push
```

---

## Troubleshooting

### ❌ Error: "relation "whatsapp_messages" does not exist"
→ Migration belum di-push. Run: `npm run supabase:db:push:whatsapp`

### ❌ Error: "duplicate key value violates unique constraint"
→ Likely conflict dengan migration lain. Check: `npm run supabase:db:list`

### ❌ WhatsApp tidak terkirim
→ Check:
1. `DOKU_WHATSAPP_ENABLED=true` di env vars
2. `DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID` set dengan benar
3. Query `whatsapp_messages` table untuk lihat error

---

## Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run supabase:db:list` | List semua migrations |
| `npm run supabase:db:push` | Push ALL pending migrations |
| `supabase db push --include-migrations "20260513000000"` | Push migration spesifik |
| `npm run supabase:db:reset` | Reset database (local only) |

---

## Next Steps

1. ✅ Run: `npm run supabase:db:push:whatsapp` (atau supabase db push)
2. ✅ Verify table di Supabase Dashboard
3. ✅ Set environment variables di Supabase
4. ✅ Test dengan payment checkout
5. ✅ Monitor logs & `whatsapp_messages` table
