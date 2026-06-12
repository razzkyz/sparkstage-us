# WhatsApp Integration - After Push Checklist

Setelah berhasil push migration dan deploy function, ikuti langkah ini:

---

## ✅ Step 1: Set Environment Variables di Supabase (PENTING!)

**Tanpa ini, WhatsApp tidak akan dikirim!**

### Lokasi: Supabase Dashboard
1. **Project Settings** (gear icon di sidebar)
2. **Edge Functions** 
3. **Environment variables**

### Tambahkan 3 variables:

```env
DOKU_WHATSAPP_ENABLED=true
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-240223-07652
DOKU_IS_PRODUCTION=true
```

**Note:**
- `DOKU_CLIENT_ID` dan `DOKU_SECRET_KEY` sudah ada (reuse dari payment)
- `TEMPLATE_ID` ganti dengan ID dari step 2 di bawah

### Klik Save & Wait
```
✓ Environment variables updated
```

---

## ✅ Step 2: Buat WhatsApp Template di DOKU Dashboard

### Lokasi: DOKU Dashboard
1. Login: https://dashboard.doku.com
2. **Settings** → **WhatsApp** (atau Message Templates)
3. **Create New Template**

### Isi Form:
```
Template Name: Ticket Confirmation
Category: Marketing (atau Transactional)
Language: Indonesian
```

Klik **Next/Continue**.

### Copy-Paste Template Body (EXACTLY):

```
Hi {{1}}! 🫶

Booking kamu di SPARK STAGE 55 berhasil 🫶

🎟️ Invoice: {{2}}
📅 Tanggal: {{3}}
⏰ Jam: {{4}}
👥 Jumlah tiket: {{5}} pax

📍 Lokasi:
{{6}}

Mohon datang 15 menit sebelum sesi dimulai.

See you, STAR ✨
```

Klik **Submit/Create**.

### Copy Template ID yang muncul:
```
Contoh: TMP-240223-07652

Update di Supabase env var:
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-240223-07652
```

---

## ✅ Step 3: Verify Database Table

### Di Supabase Dashboard:
1. **Database** → **Tables**
2. Cari table: `whatsapp_messages`
3. Lihat struktur (harus ada columns):
   - ✅ order_id, order_number
   - ✅ customer_phone, customer_name
   - ✅ template_id, params
   - ✅ doku_message_id
   - ✅ delivery_status, error_message

---

## ✅ Step 4: Test Integration di Sandbox

### Setup Test Environment (Local):

```bash
# Edit .env.local atau .env.production

VITE_DOKU_IS_PRODUCTION=false
DOKU_IS_PRODUCTION=false
DOKU_WHATSAPP_ENABLED=true
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-SANDBOX-XXXXX
```

### Test Steps:

1. **Buka app:** `npm run dev`
2. **Beli ticket** dengan phone number test
3. **Simulasi payment** (sandbox mode)
4. **Check logs:**
   - Supabase Dashboard → **Functions** → **doku-webhook** → **Logs**
   - Cari: `[sendTicketNotifications]`

### Expected Logs:
```
[sendTicketNotifications] Attempting to notify order: {
  order_id: 123,
  invoice_number: "TKT-ABC12345-Z1ABC",
  customer_phone: "+62821234567",
  total_quantity: 2,
}

[sendTicketNotifications] Sending WhatsApp notification to: +62821234567

[sendTicketNotifications] WhatsApp sent successfully: {
  messageId: "a8f30193-1a4f-41ac-b01f-d559e2e1339f"
}
```

---

## ✅ Step 5: Query WhatsApp Messages Table

### Di Supabase SQL Editor:

```sql
SELECT 
  id,
  order_number,
  customer_phone,
  ticket_code,
  delivery_status,
  error_message,
  doku_message_id,
  sent_at,
  created_at
FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Results:
```
| id | order_number | customer_phone | ticket_code | delivery_status | doku_message_id |
|----|--------------|----------------|-------------|-----------------|-----------------|
| 1  | SPK-123...   | +62821234567   | TKT-ABC...  | submitted       | a8f30193...     |
```

---

## ✅ Step 6: Troubleshoot jika Ada Error

### Error: WhatsApp tidak terkirim

**Check 1: Verify Environment Variables**
```bash
# Di Supabase Dashboard → Edge Functions
# Pastikan:
✓ DOKU_WHATSAPP_ENABLED=true
✓ DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-240223-07652
✓ DOKU_IS_PRODUCTION=true (untuk production)
```

**Check 2: Verify Template ID**
```bash
# Di DOKU Dashboard → WhatsApp Templates
# Pastikan Template ID match dengan env var
```

**Check 3: Check Phone Number Format**
```bash
# Phone harus dalam format:
✓ +62821234567
✓ 0821234567
✓ 62821234567

❌ 08-2123-4567 (format salah)
```

**Check 4: Check Logs**
```bash
# Supabase → Functions → doku-webhook → Logs
# Cari error messages, contoh:
- "invalid_template_id"
- "invalid_signature"
- "invalid_phone_number"
```

**Check 5: Query Error Messages**
```sql
SELECT 
  error_message,
  COUNT(*) as count
FROM whatsapp_messages
WHERE delivery_status = 'failed'
GROUP BY error_message;
```

---

## ✅ Step 7: Enable for Production

### Setelah Testing Berhasil:

1. **Update Environment Variables** di Supabase Production:
```env
DOKU_WHATSAPP_ENABLED=true
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-PRODUCTION-ID
DOKU_IS_PRODUCTION=true
```

2. **Re-deploy function:**
```bash
npm run supabase:functions:deploy:doku-webhook
```

3. **Monitor Logs** untuk pertama kali:
   - Check delivery status
   - Check error messages
   - Verify phone numbers format

---

## 📊 Monitoring & Maintenance

### Daily Monitoring:

```sql
-- Check delivery rate
SELECT 
  delivery_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM whatsapp_messages
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY delivery_status;
```

### Weekly Report:

```sql
-- Top errors in last 7 days
SELECT 
  error_message,
  COUNT(*) as count,
  STRING_AGG(DISTINCT order_number, ', ') as sample_orders
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '7 days'
  AND delivery_status = 'failed'
  AND error_message IS NOT NULL
GROUP BY error_message
ORDER BY count DESC;
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| WhatsApp tidak terkirim | Verify `DOKU_WHATSAPP_ENABLED=true` di env |
| "Template not found" | Check template ID di DOKU & update env var |
| "Invalid signature" | Verify `DOKU_SECRET_KEY` di env |
| "Invalid phone number" | Phone harus format `+62...` atau `0...` |
| "Module not found" error saat deploy | Sudah fixed, coba push lagi |

---

## 📝 Quick Command Reference

```bash
# List migrations
npm run supabase:db:list

# Push migration
npm run supabase:db:push:whatsapp

# Deploy webhook function
npm run supabase:functions:deploy:doku-webhook

# View logs locally
npm run supabase:functions:serve

# Query WhatsApp table
# → Supabase Dashboard → SQL Editor
```

---

## ✅ Checklist Sebelum Production

- [ ] Environment variables set di Supabase
- [ ] WhatsApp template created di DOKU & template ID noted
- [ ] Database table `whatsapp_messages` created
- [ ] Test ticket purchase → WhatsApp received
- [ ] Logs show successful sends
- [ ] Delivery status = "submitted" 
- [ ] Error rate < 5%
- [ ] Re-deploy function untuk production
- [ ] Monitor first 24 hours di production

---

## Next Steps Summary

1. **Immediate:** Set env variables di Supabase ⏰ 2 menit
2. **DOKU Dashboard:** Create WhatsApp template ⏰ 5 menit
3. **Test:** Buy ticket & verify WhatsApp received ⏰ 10 menit
4. **Monitor:** Check logs & database table ⏰ 5 menit
5. **Production:** Update env vars & redeploy ⏰ 2 menit

**Total: ~25 menit untuk full setup!**

---

Kalau ada error atau stuck, check [whatsapp-notifications.md](./whatsapp-notifications.md) untuk detail lebih lanjut!
