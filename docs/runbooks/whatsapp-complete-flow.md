# WhatsApp Integration - Complete Flow Explanation

## 1️⃣ Secret Key untuk WhatsApp Function

**Tidak perlu secret key baru!** 

WhatsApp function menggunakan **secret key yang SAMA dengan payment:**

```
DOKU_SECRET_KEY (sudah ada)
↓
Digunakan untuk:
✓ Payment signatures (DOKU checkout)
✓ WhatsApp signatures (DOKU WhatsApp API)
✓ Webhook verification
```

**Lokasi:** Supabase → Edge Functions → Environment variables
```
DOKU_SECRET_KEY: [your_existing_secret_key]
DOKU_CLIENT_ID: [your_existing_client_id]
```

❌ Tidak perlu buat secret baru
✅ Reuse secret dari payment integration

---

## 2️⃣ Dari Mana Template ID (TMP-...)?

### Step 1: Buat Template di DOKU Dashboard

**Lokasi:** https://dashboard.doku.com

```
Settings 
  ↓
WhatsApp / Message Templates
  ↓
Create New Template
```

### Step 2: Isi Form Template

```
Template Name: Ticket Confirmation
Category: Marketing
Language: Indonesian
```

Klik **Next**.

### Step 3: Copy-Paste Template Body

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

### Step 4: DOKU Generate Template ID

Setelah submit, DOKU akan show:

```
✓ Template Created Successfully

Template ID: TMP-240223-07652
```

**Inilah yang disebut "TMP-..." itu!** Itu adalah ID unik dari DOKU untuk template ini.

### Step 5: Copy Template ID ke Supabase

```
Supabase Dashboard
  ↓
Settings → Edge Functions
  ↓
Environment variables
  ↓
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID: TMP-240223-07652
```

---

## 3️⃣ Complete Flow - Dari Payment sampai WhatsApp

### Diagram Flow:

```
┌─────────────────────────────────────────────────┐
│  CUSTOMER JOURNEY                               │
└─────────────────────────────────────────────────┘

1. CHECKOUT PAGE
   ├─ Input: Nama, Email, PHONE NUMBER (08...)
   │  (Phone number SAVED ke orders.customer_phone)
   ├─ Select Tickets
   └─ Click "Pay Now"
       ↓

2. PAYMENT PAGE (DOKU)
   ├─ Customer bayar
   └─ Payment Success
       ↓

3. DOKU WEBHOOK (automatic)
   ├─ DOKU kirim webhook ke backend
   ├─ Backend verify payment
   └─ Status = PAID
       ↓

4. TICKET ISSUANCE (automatic)
   ├─ Create purchased_tickets
   ├─ Get ticket_code (TKT-ABC...)
   └─ Award loyalty points
       ↓

5. WHATSAPP SEND (automatic) ← YANG BARU!
   ├─ Get customer_phone dari orders table
   ├─ Build WhatsApp message dengan:
   │  - Nama customer
   │  - Ticket code (TKT-...)
   │  - Tanggal booking
   │  - Jam session
   │  - Jumlah tiket
   │  - Venue name
   ├─ Send ke DOKU WhatsApp API
   └─ DOKU kirim ke customer via WhatsApp
       ↓

6. CUSTOMER RECEIVES
   ├─ WhatsApp message di HP
   │  "Hi John Doe! 🫶
   │   Booking kamu di SPARK STAGE 55 berhasil 🫶
   │   🎟️ Invoice: TKT-ABC12345-Z1ABC
   │   📅 Tanggal: 15 Mei 2026
   │   ⏰ Jam: 19:00
   │   👥 Jumlah tiket: 2 pax
   │   ..."
   └─ ✓ Done!
```

---

## 4️⃣ Phone Number Input - Di Mana?

### Lokasi di Frontend:

**File:** `frontend/src/pages/BookingCheckout.tsx` (atau checkout page)

```typescript
// Input fields yang ada:
<input name="customerName" placeholder="Nama Anda" />
<input name="customerEmail" placeholder="Email Anda" />
<input name="customerPhone" placeholder="Nomor WhatsApp (08...)" />  ← INI!
```

### Apa yang terjadi:

```
Customer input: "082123456789"
    ↓
Save ke database: orders.customer_phone = "082123456789"
    ↓
WhatsApp function di-trigger saat payment success
    ↓
Function fetch: orders.customer_phone = "082123456789"
    ↓
Normalize: "082123456789" → "62821234567" (otomatis)
    ↓
Send ke DOKU: destinationPhone: "62821234567"
    ↓
DOKU send ke WhatsApp customer
```

---

## 5️⃣ Data Flow Database

### Tabel yang Terlibat:

```
┌─────────────────┐
│ orders          │
├─────────────────┤
│ id              │
│ order_number    │
│ customer_name   │ ← Nama untuk {{1}}
│ customer_email  │
│ customer_phone  │ ← Phone untuk send
│ total_amount    │
│ status = PAID   │ ← Trigger WhatsApp
└─────────────────┘
        ↓ (payment success)
        ↓ (status → PAID)
        ↓
┌──────────────────────┐
│ payment-effects.ts   │
│ sendTicketNotif...   │ ← BACA customer_phone
│ buildParams()        │ ← FORMAT message
│ sendWhatsApp()       │ ← KIRIM ke DOKU
└──────────────────────┘
        ↓ (send)
        ↓
┌─────────────────────────┐
│ whatsapp_messages       │ ← LOG untuk tracking
├─────────────────────────┤
│ id                      │
│ order_id → orders(id)   │
│ customer_phone          │
│ doku_message_id         │
│ delivery_status         │
│ error_message (jika ada)│
└─────────────────────────┘
        ↓ (save to log)
        ↓
    DOKU API
        ↓
   WhatsApp Service
        ↓
   Customer Phone
```

---

## 6️⃣ Saat Payment Success - Apa yang Terjadi?

### Automatic Flow:

```
Payment Status = PAID
    ↓
Webhook doku-webhook/index.ts
    ├─ Call: processTicketOrderTransition(status = "paid")
    ├─ Call: issueTicketsIfNeeded()
    │  └─ Create purchased_tickets dengan ticket_code
    └─ Call: sendTicketNotificationsIfNeeded() ← WHATSAPP!
        ├─ Fetch order data
        │  └─ customer_name, customer_phone, customer_email
        ├─ Fetch order_items
        │  └─ selected_date, selected_time_slots, quantity
        ├─ Fetch purchased_tickets (first ticket)
        │  └─ ticket_code (TKT-...)
        ├─ Check: DOKU_WHATSAPP_ENABLED = true?
        ├─ Build params:
        │  [
        │    "John Doe",              {{1}}
        │    "TKT-ABC12345-Z1ABC",    {{2}}
        │    "15 Mei 2026",           {{3}}
        │    "19:00",                 {{4}}
        │    "2",                     {{5}}
        │    "SPARK STAGE 55"         {{6}}
        │  ]
        ├─ Call: sendWhatsAppMessage()
        │  ├─ Generate requestId, requestTimestamp
        │  ├─ Generate signature (using DOKU_SECRET_KEY)
        │  ├─ Send POST to DOKU WhatsApp API
        │  └─ Get response: messageId
        └─ Log to whatsapp_messages table
           └─ delivery_status = "submitted"
                 ↓
            DOKU send via WhatsApp
                 ↓
            Customer receive message!
```

---

## 7️⃣ Environment Variables Yang Dibutuhkan

```
DOKU_CLIENT_ID              (sudah ada - payment)
DOKU_SECRET_KEY             (sudah ada - payment) ← Used for WhatsApp!
DOKU_IS_PRODUCTION          (sudah ada - payment)
DOKU_WHATSAPP_ENABLED       (BARU) = true
DOKU_WHATSAPP_TICKET_...    (BARU) = TMP-240223-07652
```

**Yang perlu DITAMBAHKAN di Supabase:**
- `DOKU_WHATSAPP_ENABLED` = `true`
- `DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID` = `TMP-...` (dari DOKU)

---

## 8️⃣ Cek WhatsApp di Database

Setelah customer bayar, cek table:

```sql
-- Query: Lihat WhatsApp yang sudah terkirim
SELECT 
  order_number,
  customer_phone,
  ticket_code,
  delivery_status,
  doku_message_id,
  error_message,
  sent_at
FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 10;
```

Expected output:
```
| order_number | customer_phone | ticket_code | delivery_status | doku_message_id |
|--------------|----------------|-------------|-----------------|-----------------|
| SPK-123...   | +62821234567   | TKT-ABC...  | submitted       | a8f30193...     |
```

---

## ✅ Checklist Sebelum Go Live

- [ ] Customer phone input ada di checkout page
- [ ] `DOKU_WHATSAPP_ENABLED=true` di Supabase env vars
- [ ] `DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-...` di Supabase
- [ ] Template sudah dibuat di DOKU Dashboard
- [ ] `DOKU_SECRET_KEY` sudah di Supabase (reuse dari payment)
- [ ] Function doku-webhook sudah di-deploy
- [ ] Migration `whatsapp_messages` table sudah di-push
- [ ] Test: Buy ticket → See WhatsApp sent
- [ ] Monitor: Check `whatsapp_messages` table

---

## 🎯 Summary

| Pertanyaan | Jawaban |
|-----------|---------|
| Secret key dari mana? | Reuse `DOKU_SECRET_KEY` (sudah ada) |
| Template ID dari mana? | Buat template di DOKU Dashboard, dapat ID `TMP-...` |
| Phone number di input mana? | Checkout page → field "Nomor WhatsApp" |
| Kapan WhatsApp dikirim? | Automatic setelah payment success |
| Ke mana WhatsApp dikirim? | Ke phone number yang di-input customer |
| Apa isi WhatsApp? | Billing notification dengan invoice, date, time, qty |

---

Sudah jelas? Ada yang mau ditanya lagi? 🚀
