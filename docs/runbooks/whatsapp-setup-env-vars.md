# Setup Environment Variables di Supabase - Step by Step

## ⚠️ PENTING! Setup ini WAJIB sebelum WhatsApp bisa kirim!

Tanpa setup ini, WhatsApp tidak akan jalan sama sekali.

---

## Step 1: Buka Supabase Dashboard

1. Go to: https://app.supabase.com
2. Login dengan akun Anda
3. Pilih project **sparkstage** (atau nama project Anda)

---

## Step 2: Navigate ke Environment Variables

**Di Dashboard:**
1. Klik **Settings** (gear icon di sidebar kiri)
2. Di submenu, pilih **Edge Functions**
3. Scroll ke bagian **Environment variables**

Akan melihat halaman seperti ini:
```
[Environment variables for Edge Functions]
[Add variable] [button]

Current variables:
- DOKU_CLIENT_ID: [value]
- DOKU_SECRET_KEY: [value]
- SUPABASE_URL: [value]
- ... (other variables)
```

---

## Step 3: Tambahkan Variable Pertama - DOKU_WHATSAPP_ENABLED

**Klik tombol:** `[Add variable]`

Form yang muncul:
```
Name: DOKU_WHATSAPP_ENABLED
Value: true
```

Klik **Save**.

### Output yang diharapkan:
```
✓ Environment variable added
```

---

## Step 4: Tambahkan Variable Kedua - DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID

**Klik tombol:** `[Add variable]` (lagi)

Form yang muncul:
```
Name: DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID
Value: TMP-XXXXXX-XXXXX
```

**PENTING:** Nilai `TMP-XXXXXX-XXXXX` ini adalah placeholder. 

**Nantinya akan diganti dengan:**
- Setelah membuat template di DOKU Dashboard
- Template ID dari DOKU (format: `TMP-240223-07652` atau sejenisnya)

**Untuk sekarang, boleh gunakan placeholder:**
```
TMP-PLACEHOLDER-00000
```

Klik **Save**.

---

## Step 5: Verify Semua Variables

Setelah save, akan melihat list:

```
Environment variables:
✓ DOKU_CLIENT_ID: your_client_id
✓ DOKU_SECRET_KEY: your_secret_key
✓ DOKU_WHATSAPP_ENABLED: true
✓ DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID: TMP-XXXXXX-XXXXX
✓ DOKU_IS_PRODUCTION: true
✓ SUPABASE_URL: ...
✓ SUPABASE_ANON_KEY: ...
```

---

## Format Phone Number - Sudah Otomatis!

Sistem akan otomatis normalize phone ke format DOKU:

```
Customer input        →  Di-normalize jadi  →  Kirim ke DOKU
08-2123-4567         →  62821234567        →  ✓
082123456 7          →  62821234567        →  ✓
+6282123456 7        →  62821234567        →  ✓
0821234567           →  62821234567        →  ✓ (ini yang paling sering)
62821234567          →  62821234567        →  ✓
```

**Jadi customer boleh input format apapun, sistem akan handle!** ✅

---

## Nanti - Update dengan Template ID Asli

Setelah Anda buat template di DOKU:

1. Go to **DOKU Dashboard**
2. **Settings → WhatsApp Templates**
3. Create template
4. Akan dapat Template ID (contoh: `TMP-240223-07652`)
5. Update di Supabase:

**Edit variable:**
```
Name: DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID
Value: TMP-240223-07652  (update dengan ID asli)
```

Klik **Save** & **Redeploy function** (atau just wait untuk auto-pick-up).

---

## Checklist Setelah Setup

- [ ] ✓ DOKU_WHATSAPP_ENABLED = `true`
- [ ] ✓ DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID = `TMP-...` (placeholder ok for now)
- [ ] ✓ DOKU_CLIENT_ID = ada (reuse dari payment)
- [ ] ✓ DOKU_SECRET_KEY = ada (reuse dari payment)
- [ ] ✓ DOKU_IS_PRODUCTION = `true` (untuk production) or `false` (untuk sandbox)

---

## Screenshot Reference

### Lokasi Environment Variables di Supabase:
```
Dashboard
  ↓
Settings (gear icon)
  ↓
Edge Functions (di submenu)
  ↓
Environment variables (section)
  ↓
[Add variable] button
```

---

## Verifikasi Deploy Function

Setelah environment variables set, redeploy function:

```bash
npm run supabase:functions:deploy:doku-webhook
```

Expected output:
```
✓ Function deployed successfully: doku-webhook
```

Jika masih ada error, cek:
1. Semua env variables sudah set?
2. Template ID valid?
3. DOKU credentials benar?

---

## Testing

Setelah env variables set & function deployed:

1. **Beli ticket** dengan phone format `08...` (atau format lain)
2. **Complete payment**
3. **Check logs:**
   - Supabase → Functions → doku-webhook → Logs
   - Cari: `[sendTicketNotifications] WhatsApp sent successfully`

---

## Next - Buat Template di DOKU

Setelah setup env vars di Supabase, step berikutnya:

1. Buka DOKU Dashboard
2. Settings → WhatsApp Templates → Create
3. Isi template body
4. Dapat Template ID
5. Update di Supabase env var

Detail: [whatsapp-notifications.md](./whatsapp-notifications.md)

---

Sudah set env variables-nya kah? 🚀
