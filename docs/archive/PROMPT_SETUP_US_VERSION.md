# 🤖 Ready-to-Use Prompt untuk Setup SparkStage US

## 📋 Cara Pakai:

**Copy salah satu prompt di bawah dan paste ke chat dengan agent.**

---

## 🎯 PROMPT 1: Complete Setup (Recommended)

```
Saya sudah copy folder sparkstage ke sparkstageus di C:\SparkDoku\sparkstageus.

Tolong bantu saya setup versi US dengan langkah berikut:

1. Clean git history dan initialize git baru di folder sparkstageus
2. Update package.json name menjadi "sparkstage-us"
3. Install semua dependencies termasuk Stripe packages (@stripe/stripe-js dan @stripe/react-stripe-js)
4. Create .env.local dari template .env.us-example
5. Update vite.config.ts untuk menggunakan port 5174 (bukan 5173)
6. Beri tahu saya credentials Supabase apa saja yang perlu saya isi di .env.local

Folder location: C:\SparkDoku\sparkstageus

Jangan jalankan migration atau link Supabase dulu, karena saya belum buat US Supabase project.
```

---

## 🎯 PROMPT 2: Setelah Punya Supabase US Project

```
Saya sudah buat US Supabase project dengan details:
- Project Name: sparkstage-us
- Region: US West (Oregon)
- Project Ref: [PASTE PROJECT REF ANDA DI SINI]
- Database Password: [SIMPAN INI DI TEMPAT AMAN]

Sekarang tolong:
1. Link folder sparkstageus ke US Supabase project ini
2. Analisa migration files di supabase/migrations/ dan beri tahu saya file mana yang perlu diubah (DOKU → Stripe)
3. Jangan push migration dulu, tunjukkan saja perubahan yang perlu dilakukan

Folder: C:\SparkDoku\sparkstageus
```

---

## 🎯 PROMPT 3: Update Database Migrations

```
Tolong update migration files di C:\SparkDoku\sparkstageus\supabase\migrations\ dengan perubahan ini:

REPLACE semua DOKU columns dengan Stripe columns:
- doku_order_id → stripe_payment_intent_id
- doku_invoice_number → stripe_customer_id
- doku_payment_url → stripe_client_secret

Tables yang perlu diupdate:
- orders table
- order_products table

Setelah update, tunjukkan summary perubahan yang sudah dilakukan.
```

---

## 🎯 PROMPT 4: Push Migrations & Set Secrets

```
Saya punya Stripe credentials:
- Publishable Key: pk_test_xxxxx (GANTI DENGAN KEY ANDA)
- Secret Key: sk_test_xxxxx (GANTI DENGAN KEY ANDA)
- Webhook Secret: whsec_xxxxx (GANTI DENGAN KEY ANDA)

Tolong:
1. Push migrations ke US Supabase database
2. Set Supabase secrets untuk Stripe
3. Verify bahwa secrets sudah terinstall

Folder: C:\SparkDoku\sparkstageus
```

---

## 🎯 PROMPT 5: Update Frontend Code

```
Tolong update frontend code di C:\SparkDoku\sparkstageus untuk menggunakan Stripe:

Files yang perlu diupdate:
1. frontend/src/pages/PaymentPage.tsx
   - Replace DOKU Jokul SDK dengan Stripe Elements
   - Gunakan @stripe/react-stripe-js

2. frontend/src/pages/ProductCheckoutPage.tsx
   - Update checkout flow untuk Stripe

3. frontend/src/utils/currency.ts
   - Replace formatRupiah() dengan formatCurrency() untuk USD

Gunakan code examples dari .agents/skills/sparkstage-us-builder/STRIPE_EXAMPLES.md sebagai reference.

Tunjukkan file mana yang sudah diupdate dan summary perubahannya.
```

---

## 🎯 PROMPT 6: Delete DOKU Functions & Create Stripe Functions

```
Di folder C:\SparkDoku\sparkstageus\supabase\functions\:

1. DELETE functions ini (tidak dipakai di US):
   - create-doku-ticket-checkout
   - create-doku-product-checkout
   - doku-webhook
   - sync-doku-ticket-status
   - sync-doku-product-status
   - rajaongkir (folder)

2. CREATE Stripe functions baru:
   - create-stripe-ticket-checkout
   - create-stripe-product-checkout
   - stripe-webhook
   - sync-stripe-payment-status

Gunakan code dari STRIPE_EXAMPLES.md untuk isi function-nya.
```

---

## 🎯 PROMPT 7: Test & Verify

```
Tolong verify setup SparkStage US di C:\SparkDoku\sparkstageus:

1. Check apakah dependencies terinstall (termasuk Stripe packages)
2. Check apakah .env.local punya semua Stripe credentials
3. Check apakah port di vite.config.ts adalah 5174
4. Check apakah Supabase linked ke US project
5. Test start dev server: npm run dev

Beri report lengkap tentang status setup.
```

---

## 🎯 PROMPT ALL-IN-ONE (Untuk yang Sudah Siap Semua)

```
Saya sudah:
- Copy folder sparkstage → sparkstageus (C:\SparkDoku\sparkstageus)
- Buat US Supabase project (project ref: [PASTE REF ANDA])
- Dapat Stripe credentials:
  - Publishable: pk_test_xxxxx
  - Secret: sk_test_xxxxx
  - Webhook: whsec_xxxxx

Tolong setup complete SparkStage US version dengan steps:

1. Clean git & initialize baru
2. Install dependencies termasuk Stripe packages
3. Setup .env.local dengan credentials di atas
4. Link ke US Supabase project
5. Update migrations (DOKU → Stripe columns)
6. Push migrations
7. Set Supabase secrets
8. Update vite config (port 5174)
9. Delete DOKU functions
10. Create Stripe functions dengan code dari STRIPE_EXAMPLES.md
11. Update frontend PaymentPage.tsx untuk Stripe Elements
12. Verify dan test

Folder: C:\SparkDoku\sparkstageus

Jalankan step by step dan beri tahu progress setiap step.
```

---

## 🎯 PROMPT TROUBLESHOOTING

```
Saya mengalami issue di SparkStage US (C:\SparkDoku\sparkstageus):

[DESCRIBE ISSUE ANDA DI SINI, contoh:]
- Error: Port 5173 already in use
- Error: Stripe is not defined
- Error: Supabase project not found
- dll

Tolong:
1. Diagnosa masalahnya
2. Beri solusi
3. Fix issue tersebut
```

---

## 📝 Template Credentials (Untuk Anda Isi)

Simpan ini dan isi dengan credentials Anda sendiri:

```
=== SUPABASE US PROJECT ===
Project URL: https://xxxxx.supabase.co
Project Ref: xxxxx
Anon Key: eyJhbGc...
Service Role Key: eyJhbGc...
Database Password: [password anda]

=== STRIPE (TEST MODE) ===
Publishable Key: pk_test_xxxxx
Secret Key: sk_test_xxxxx
Webhook Secret: whsec_xxxxx

=== EASYPOST (OPTIONAL) ===
API Key: EZAK...
```

---

## 💡 Tips Menggunakan Prompt:

1. **Ganti placeholder** dengan values Anda:
   - `[PASTE PROJECT REF ANDA]` → Project ref dari Supabase
   - `pk_test_xxxxx` → Stripe publishable key Anda
   - `sk_test_xxxxx` → Stripe secret key Anda
   - dll

2. **Gunakan prompt bertahap:**
   - Jangan langsung pakai ALL-IN-ONE jika Anda belum siap
   - Mulai dari PROMPT 1, lalu 2, dst

3. **Verify setiap step:**
   - Setelah agent selesai, check hasilnya
   - Baru lanjut ke prompt berikutnya

4. **Simpan credentials dengan aman:**
   - Jangan commit ke git
   - Gunakan password manager

---

## 🚀 Recommended Workflow:

### Day 1: Setup Dasar
1. Use **PROMPT 1** (Complete Setup)
2. Create Supabase US project manual
3. Get Stripe test account & keys

### Day 2: Database & Backend  
4. Use **PROMPT 2** (Link Supabase)
5. Use **PROMPT 3** (Update Migrations)
6. Use **PROMPT 4** (Push & Secrets)
7. Use **PROMPT 6** (Functions)

### Day 3: Frontend & Testing
8. Use **PROMPT 5** (Update Frontend)
9. Use **PROMPT 7** (Test & Verify)
10. Manual testing dengan Stripe test cards

---

## 📚 Dokumentasi Reference:

Semua dokumentasi ada di `.agents/skills/sparkstage-us-builder/`:
- `SEPARATE_FOLDER_SETUP.md` - Detailed guide
- `QUICKSTART_ID.md` - Bahasa Indonesia
- `STRIPE_EXAMPLES.md` - Code examples
- `QUICK_COMMANDS.md` - Command reference
- `DATABASE_STRATEGY.md` - Database separation

---

**Dibuat:** 2026-06-13
**For:** SparkStage US Version Setup
**Location:** C:\SparkDoku\sparkstageus
