# Migrasi Dari Midtrans ke DOKU

## Tujuan

Dokumen ini merangkum hasil riset awal untuk migrasi payment gateway dari Midtrans ke DOKU pada repo Spark Stage, lalu menerjemahkannya menjadi checklist kerja bertahap.

Catatan verifikasi repo per 2026-04-24:

- Checklist di bawah dicentang hanya untuk item yang terbukti dari code dan docs di repo.
- Item yang butuh bukti runtime sandbox, dashboard DOKU, env production, atau operasi manual tetap dibiarkan belum dicentang.
- Per 2026-04-24, rename codebase ke nama `doku-*` sudah selesai dan edge function baru dengan nama `doku-*` sudah ter-deploy ke Supabase.
- Function remote lama dengan nama `midtrans-*` belum dihapus karena cutover webhook dashboard DOKU dan cron scheduler remote masih menunggu langkah operasional terakhir.

Catatan status operasional per 2026-04-25:

- Sandbox flow yang sudah dinyatakan lolos manual:
  - booking tiket
  - produk online
  - produk bayar kasir
- Secret DOKU production untuk Supabase sudah diisi manual oleh operator pada 2026-04-25.
- `VITE_DOKU_IS_PRODUCTION=true` sudah diisi manual oleh operator pada hosting frontend production pada 2026-04-25.
- `Checkout Appearance` DOKU sudah dibatasi manual untuk fase awal agar metode yang tampil lebih sempit.
- `Pengaturan Kadaluarsa` DOKU dashboard sudah diset manual ke `0 jam 30 menit` pada 2026-04-25.
- `Notification URL` sudah diisi manual untuk:
  - Virtual Account Non-SNAP
  - Convenience Store yang aktif
- Repo ini memakai flag internal `DOKU_IS_PRODUCTION` dan `VITE_DOKU_IS_PRODUCTION` hanya untuk memilih endpoint / JS URL sandbox vs production.
- DOKU Checkout sendiri tidak memakai parameter resmi bernama `production=true` atau `isProduction=true` pada request API.
- Banyak channel merchant DOKU saat ini aktif sebagai `SNAP`; repo saat ini belum diperlakukan siap untuk membuka channel SNAP ke user publik.
- Pada sesi operator 2026-04-25, menu `e-Wallet` di dashboard DOKU tidak berperilaku seperti `Virtual Account`:
  - `DOKU e-Wallet` terlihat `ACTIVE`
  - channel seperti DANA / OVO / LinkAja terlihat disabled / tidak bisa dipilih
  - halaman `e-Wallet` sering menampilkan status `Hold On / service is not activated yet / Activate Now`, yang dibaca sebagai tanda service atau channel merchant belum fully activated / belum approved oleh DOKU
- Untuk channel e-Wallet pihak ketiga seperti DANA / OVO / ShopeePay dan sejenisnya, repo ini belum menganggap channel siap dipakai sampai:
  - channel benar-benar aktif dan selectable di dashboard merchant
  - jalur notification / konfigurasi operasionalnya jelas
  - scope launch awal memang sudah memerlukan channel tersebut
- Live smoke test tiket production pada 2026-04-25 sudah dinyatakan lolos manual:
  - checkout production terbuka dan transaksi memakai uang asli
  - user lain `pradawashere@gmail.com` berhasil menyelesaikan payment
  - redirect kembali ke domain production sudah benar, tidak lagi ke `localhost`
  - login admin berhasil memindai tiket hasil transaksi live
- Live test produk pada 2026-04-25 juga dinyatakan lolos manual dengan akun `pradawashere@gmail.com`:
  - checkout produk DOKU berhasil
  - flow bayar kasir produk berhasil
  - produk sudah bisa dibeli pada akun official DOKU
- Bug redirect ke `http://localhost:5173/booking-success?...` sempat ditemukan pada sesi live test awal 2026-04-25.
- Akar masalahnya sudah ditelusuri dan diperbaiki:
  - secret production `PUBLIC_APP_URL` di Supabase sebelumnya masih mengarah ke `http://localhost:5173`
  - helper backend untuk memilih public app URL diperketat agar memprioritaskan `PUBLIC_APP_URL` / `APP_URL`
  - secret production dan edge functions terkait sudah dideploy ulang setelah perbaikan
- Cutover production dasar sudah lolos untuk scope launch awal yang dibatasi.
- Sisa backlog utama per 2026-04-25 sekarang didominasi hardening engineering, test automation, dan cleanup pasca-cutover.

Catatan operasional tambahan per 2026-04-26:

- seluruh monitor UptimeRobot yang sebelumnya dipakai untuk warm-up flow Midtrans sudah dicopot
- tidak ada lagi traffic internal yang sengaja "menghangatkan Midtrans" edge functions
- dokumentasi repo tidak lagi memperlakukan UptimeRobot warm-up sebagai komponen aktif dari arsitektur payment

Catatan operasional tambahan per 2026-04-28:

- channel `QRIS` di dashboard merchant DOKU sudah terlihat `Active`
- halaman `QRIS Notify URL` di merchant DOKU juga sudah menampilkan status `Active`
- artinya dari sisi aktivasi channel merchant, `QRIS` tidak lagi diperlakukan sebagai channel yang masih menunggu approval

Catatan operasional tambahan per 2026-04-29:

- smoke test QRIS production untuk pembelian tiket sudah berhasil memakai QRIS via ShopeePay
- transaksi QRIS tersebut memakai flow real / akun official, bukan sandbox
- bukti dokumentasi smoke test sudah disimpan operator dalam bentuk foto
- dengan hasil ini, `QRIS` sudah dianggap tervalidasi untuk flow pembelian tiket real
- produk via QRIS tetap perlu dianggap belum terbukti terpisah sampai ada smoke test produk khusus QRIS bila scope operasional membutuhkannya

Catatan debugging QRIS per 2026-04-30:

- QRIS sempat tidak muncul di checkout DOKU walaupun channel dan notify URL sudah `Active` di dashboard merchant.
- Akar masalahnya bukan aktivasi DOKU, tetapi whitelist payload dari edge function: `payment.payment_method_types` hanya berisi `VIRTUAL_ACCOUNT_BNI`, `ONLINE_TO_OFFLINE_INDOMARET`, dan `ONLINE_TO_OFFLINE_ALFA`.
- Order live yang menguatkan temuan ini: `SPK-1777534667578-KFSQD` menyimpan `payment_data.payment_method_types` tanpa `QRIS`.
- Secret production Supabase `DOKU_PAYMENT_METHOD_TYPES` sudah dikoreksi menjadi `VIRTUAL_ACCOUNT_BNI,ONLINE_TO_OFFLINE_INDOMARET,ONLINE_TO_OFFLINE_ALFA,QRIS`.
- Jika `payment.payment_method_types` dikirim, dashboard ON saja tidak cukup; QRIS harus ikut ada di whitelist payload agar tampil di DOKU Checkout.

Asumsi dokumen ini:

- Akun DOKU sudah terverifikasi dan siap dipakai
- Merchant sudah memiliki credential sandbox dan production
- Target migrasi adalah mengganti flow Midtrans yang ada sekarang dengan flow DOKU yang paling dekat secara arsitektur

## Rangkuman Hasil Belajar

### Rekomendasi jalur integrasi

Untuk codebase ini, jalur integrasi yang paling cocok adalah **DOKU Checkout**, bukan **DOKU Direct API SNAP**.

Alasannya:

- Flow repo saat ini memakai pola hosted payment page ala Midtrans Snap
- DOKU Checkout juga memakai pola backend membuat payment session lalu frontend membuka halaman pembayaran DOKU
- Perubahan frontend akan lebih kecil karena kita cukup mengganti Snap token menjadi `payment.url`
- Kompleksitas autentikasi dan signature lebih rendah dibanding SNAP Direct API

### Perbedaan inti Midtrans vs DOKU

Midtrans saat ini di repo:

- Backend membuat token Snap
- Frontend memanggil popup Snap
- Webhook Midtrans mengubah status order

DOKU Checkout:

- Backend membuat checkout payment ke endpoint DOKU
- DOKU mengembalikan `payment.url`
- Frontend bisa redirect ke URL itu atau membuka popup via JS SDK DOKU
- DOKU mengirim HTTP Notification ke endpoint merchant

### Endpoint utama DOKU Checkout

- Sandbox: `https://api-sandbox.doku.com/checkout/v1/payment`
- Production: `https://api.doku.com/checkout/v1/payment`

### Header autentikasi DOKU Checkout

Untuk request payment checkout, backend merchant mengirim header:

- `Client-Id`
- `Request-Id`
- `Request-Timestamp`
- `Signature`

`Signature` untuk DOKU Checkout memakai pola **HMAC-SHA256** pada skema non-SNAP.

### Idempotency

DOKU memakai `Request-Id` sebagai idempotency key.

Implikasinya:

- Setiap request baru harus punya `Request-Id` unik
- Jika merchant retry request yang sama dengan body yang sama, DOKU dapat membalas `409 Conflict`
- Kita perlu menyimpan `request_id` per order payment attempt agar retry aman dan terkontrol

### Bentuk request payment

Minimal request DOKU Checkout berisi:

- `order.amount`
- `order.invoice_number`
- `payment.payment_due_date` opsional

Untuk repo ini, secara praktis kita hampir pasti juga akan mengirim:

- `order.line_items`
- `payment.payment_method_types`
- `customer`
- `order.callback_url` atau `order.callback_url_result`
- `additional_info.override_notification_url` bila diperlukan

Catatan penting:

- `order.amount` dalam IDR tanpa desimal
- `order.invoice_number` harus unik
- Untuk beberapa payment method, `line_items`, `customer`, `shipping_address`, dan `billing_address` bisa menjadi mandatory

### Frontend DOKU Checkout

Setelah backend mendapat `payment.url`, frontend punya dua opsi:

1. Redirect langsung ke `payment.url`
2. Membuka popup/modal dengan JS DOKU

Lokasi script:

- Sandbox: `https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js`
- Production: `https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js`

Kesimpulan praktis:

- Untuk migrasi cepat dan stabil, redirect lebih sederhana
- Jika ingin UX mirip Midtrans Snap, popup DOKU JS bisa dipakai

### Notification / webhook

DOKU sangat bergantung pada HTTP Notification untuk finalisasi status.

Aturan penting:

- Notification URL harus publik
- Disarankan `https://`
- Tidak bisa localhost
- Tidak bisa URL di balik auth, VPN, atau port aneh
- `ngrok` tidak didukung
- Endpoint merchant harus membalas HTTP `2xx`

Jika endpoint tidak membalas `2xx`, DOKU akan retry:

1. 30 menit setelah percobaan awal
2. 6 jam dari percobaan awal
3. 12 jam dari percobaan awal

Ada juga manual retry dari dashboard DOKU.

### Validasi notification

Notification dari DOKU harus diverifikasi signature-nya.

Ini penting karena:

- Status payment tidak boleh dipercaya hanya dari redirect frontend
- Sumber kebenaran final tetap notification server-to-server

Selain itu, DOKU menyarankan payload notification diparse **non-strict**, karena field baru bisa ditambahkan sewaktu-waktu.

### Status order

Status dasar pada DOKU Checkout:

- `Pending`
- `Success`
- `Expired`

Ada juga dokumentasi baru bahwa Check Status API dapat mengembalikan status order-level lebih awal, tetapi untuk merchant lama fitur itu bisa memerlukan aktivasi dari support DOKU.

Implikasi untuk repo ini:

- Jangan membangun flow yang sepenuhnya bergantung pada polling
- Notification tetap harus jadi jalur utama update status
- Polling/status sync hanya fallback

### Expiry dan recovery

DOKU Checkout mendukung:

- `payment.payment_due_date` per request
- expired notification
- beberapa fitur recovery order untuk channel tertentu

Untuk migrasi awal, yang paling aman:

- gunakan `payment_due_date` eksplisit dari backend
- implementasikan status `expired`
- jangan mengandalkan fitur recovery dulu sebelum flow dasar stabil

### DOKU SNAP Direct API

Riset ini juga menunjukkan bahwa DOKU SNAP Direct API memang ada, tetapi lebih kompleks:

- ada Get Token API
- ada asymmetric signature untuk token / request tertentu
- ada symmetric signature untuk request transaksional dan notification
- lebih cocok jika kita butuh integrasi channel-level yang lebih dalam

Untuk fase migrasi dari Midtrans saat ini, jalur ini tidak menjadi prioritas pertama.

## Dampak ke Arsitektur Repo

Area yang kemungkinan besar harus disentuh:

- `supabase/functions/create-doku-ticket-checkout/`
- `supabase/functions/create-doku-product-checkout/`
- `supabase/functions/doku-webhook/`
- `supabase/functions/sync-doku-ticket-status/`
- `supabase/functions/sync-doku-product-status/`
- `supabase/functions/reconcile-doku-payments/`
- `supabase/functions/_shared/doku.ts`
- `supabase/functions/_shared/payment-processors.ts`
- `supabase/functions/_shared/payment-effects.ts`
- frontend payment pages dan helper Midtrans

Pendekatan migrasi yang disarankan:

- tambahkan flow DOKU terlebih dahulu
- buat adapter status baru
- setelah stabil, baru matikan jalur Midtrans

Ini lebih aman daripada langsung mengganti semua fungsi Midtrans sekaligus dalam satu langkah.

## Todo List Migrasi

## Phase 0 - Audit dan desain

- [x] Inventaris semua titik integrasi Midtrans di frontend, edge functions, dan docs
- [x] Pisahkan flow tiket vs flow produk agar migrasi bisa dilakukan tanpa saling mengganggu
- [x] Tentukan strategi UX DOKU: redirect atau popup
- [x] Tetapkan mapping status internal app terhadap status DOKU
- [x] Tetapkan strategi invoice number dan request id yang idempotent
- [x] Tetapkan source of truth final status: notification dulu, polling fallback

Checkpoint:

- ada peta file Midtrans lama
- ada keputusan integrasi DOKU Checkout
- ada desain status mapping tertulis

## Phase 1 - Credential dan konfigurasi

- [ ] Tambahkan env sandbox dan production untuk DOKU:
- [x] `DOKU_CLIENT_ID`
- [x] `DOKU_SECRET_KEY`
- [ ] `DOKU_BASE_URL`
- [ ] `DOKU_CHECKOUT_JS_URL`
- [ ] `DOKU_NOTIFICATION_URL`
- [ ] `DOKU_CALLBACK_URL`
- [x] Buat helper shared untuk generate signature DOKU Checkout
- [x] Buat helper shared untuk request timestamp dan request id
- [x] Simpan pemisahan sandbox vs production dengan jelas
- [ ] Samakan env switch backend dan frontend untuk live cutover:
- [x] `DOKU_IS_PRODUCTION=true` di Supabase secret
- [x] `VITE_DOKU_IS_PRODUCTION=true` di frontend hosting

Catatan implementasi:

- `DOKU_IS_PRODUCTION` bukan parameter resmi DOKU; ini hanya konvensi internal repo untuk memilih endpoint `api-sandbox.doku.com` vs `api.doku.com`.
- `VITE_DOKU_IS_PRODUCTION` bukan parameter resmi DOKU; ini hanya konvensi internal repo untuk memilih JS SDK `sandbox.doku.com` vs `jokul.doku.com`.

Checkpoint:

- helper signing DOKU tersedia
- env validation untuk DOKU lulus
- sandbox request bisa dibangun secara lokal

## Phase 2 - Model data dan persistence

- [x] Tentukan field tambahan yang perlu disimpan di order tiket dan order produk
- [ ] Minimal simpan:
- [x] `provider = doku`
- [x] `provider_order_ref` atau `invoice_number`
- [x] `provider_request_id`
- [x] `payment_url`
- [x] `payment_due_at`
- [x] `provider_payload`
- [x] `provider_status`
- [ ] Tambahkan migration bila schema sekarang belum cukup
- [x] Pastikan idempotency payment attempt bisa dilacak

Checkpoint:

- schema siap menyimpan metadata DOKU
- retry request tidak menghasilkan order ganda

## Phase 3 - Backend create payment

- [x] Buat function baru untuk create checkout payment tiket via DOKU
- [x] Buat function baru untuk create checkout payment produk via DOKU
- [x] Bentuk request body DOKU dari data order internal
- [x] Isi `order.amount`, `invoice_number`, `line_items`, `customer`, callback URL, due date
- [x] Kirim header `Client-Id`, `Request-Id`, `Request-Timestamp`, `Signature`
- [x] Simpan `payment.url` dan metadata respons
- [x] Tangani `409 Conflict` idempotency dengan baik
- [x] Pastikan rollback stok / kapasitas tetap aman bila create payment gagal

Checkpoint:

- order tiket bisa menghasilkan `payment.url`
- order produk bisa menghasilkan `payment.url`
- error DOKU tidak membocorkan reservasi stok atau kapasitas

## Phase 4 - Frontend checkout

- [x] Ganti pemanggilan Midtrans Snap token menjadi pemanggilan create payment DOKU
- [ ] Pilih strategi presentasi:
- [ ] redirect ke `payment.url`, atau
- [x] popup memakai `loadJokulCheckout()`
- [x] Sesuaikan loading, timeout, dan error state di halaman payment
- [x] Pastikan user tetap bisa kembali ke success/pending page setelah redirect
- [x] Pastikan state booking / checkout tetap aman bila auth refresh terjadi

Checkpoint:

- user bisa memulai pembayaran tiket ke halaman DOKU
- user bisa memulai pembayaran produk ke halaman DOKU
- redirect balik ke app tidak merusak flow status

## Phase 5 - Notification / webhook DOKU

- [x] Buat endpoint notification DOKU baru
- [x] Verifikasi signature notification sebelum memproses payload
- [x] Parse payload secara non-strict
- [ ] Mapping status notification ke status internal:
- [x] `SUCCESS`
- [x] `PENDING`
- [x] `FAILED`
- [x] `EXPIRED`
- [ ] Pastikan side effect tetap idempotent:
- [x] issue ticket
- [x] release capacity
- [x] finalize pickup
- [x] release stock
- [x] voucher usage / release
- [x] Balas HTTP `2xx` hanya bila notification sudah diterima dan diproses aman
- [x] Simpan log notification mentah untuk audit

Checkpoint:

- notification sukses mengubah order tiket
- notification sukses mengubah order produk
- replay notification tidak menghasilkan side effect ganda

## Phase 6 - Status sync dan fallback recovery

- [x] Tentukan apakah Check Status API DOKU akan dipakai pada fase awal
- [x] Jika dipakai, buat endpoint sync status terpisah untuk tiket dan produk
- [x] Gunakan sync hanya sebagai fallback, bukan jalur utama
- [x] Sesuaikan success page dan pending page agar membaca status DOKU
- [x] Tangani kasus payment pending, success, failed, expired

Checkpoint:

- success page tidak bergantung pada redirect frontend semata
- pending page bisa pulih meski notification datang terlambat

## Phase 7 - Testing sandbox

- [x] Uji create payment tiket di sandbox
- [x] Uji create payment produk di sandbox
- [x] Uji flow produk bayar kasir
- [ ] Uji success notification
- [ ] Uji expired flow
- [ ] Uji failed / cancelled flow
- [ ] Uji retry notification
- [ ] Uji idempotency create payment dengan `Request-Id` yang sama
- [ ] Uji polling fallback bila notification terlambat
- [ ] Uji stok produk dan kapasitas tiket pada semua hasil status

Catatan verifikasi manual:

- booking test passed
- produk test passed
- produk bayar kasir passed

Checkpoint:

- semua status utama sudah lolos sandbox
- tidak ada kebocoran stok atau kapasitas
- success page dan pending page konsisten

## Phase 8 - Go-live preparation

- [x] Isi credential production
- [x] Konfigurasi Notification URL production untuk channel fase awal di dashboard DOKU
- [x] Verifikasi domain URL publik dan HTTPS pada smoke test production
- [x] Konfigurasi payment method yang ingin diaktifkan
- [x] Atur payment due date default
- [x] Siapkan manual runbook untuk retry notification dan pengecekan dashboard
- [ ] Tentukan feature flag atau cutover switch Midtrans ke DOKU

Checkpoint:

- production env lengkap
- notification production tervalidasi untuk channel fase awal
- cutover plan jelas dan bisa di-revert

## Todo Super Detail - Cutover Production

Checklist ini adalah daftar kerja operasional utama untuk pindah dari sandbox ke DOKU official. Gunakan ini sebagai source of truth saat context chat sudah tidak tersedia.

### A. Konfigurasi yang wajib benar sebelum transaksi uang asli

- [x] Verifikasi `DOKU_CLIENT_ID` production aktif di Supabase secrets
- [x] Verifikasi `DOKU_SECRET_KEY` production aktif di Supabase secrets
- [x] Verifikasi `DOKU_IS_PRODUCTION=true` aktif di Supabase secrets
- [x] Verifikasi `VITE_DOKU_IS_PRODUCTION=true` aktif di frontend hosting
- [x] Verifikasi `VITE_APP_URL` mengarah ke domain production yang benar
- [x] Verifikasi `PUBLIC_APP_URL` di Supabase sama dengan domain app yang benar
- [x] Verifikasi `APP_ALLOWED_ORIGINS` mencakup domain production final
- [x] Verifikasi frontend memuat JS `https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js`
- [x] Verifikasi backend membuat checkout ke `https://api.doku.com/checkout/v1/payment`

### B. Dashboard DOKU Back Office

- [x] Login ke DOKU Back Office production
- [x] Buka menu pengaturan payment methods yang akan dipakai saat launch
- [x] Isi `Notification URL` production pada channel fase awal yang aktif
- [x] Pastikan URL notification memakai `https://`
- [x] Pastikan URL notification bisa diakses publik tanpa auth, VPN, atau port aneh
- [ ] Jika memakai override notification URL, pastikan path sama dengan URL yang dikonfigurasi di dashboard
- [x] Catat channel payment mana saja yang diaktifkan saat fase awal
- [x] Nonaktifkan channel yang belum siap didukung payload repo

Catatan operator saat ini:

- Jalur fase awal difokuskan ke channel non-SNAP / yang paling mudah diverifikasi manual.
- `Virtual Account` merchant banyak yang aktif sebagai SNAP, tetapi repo belum dianggap siap membuka SNAP ke user publik.
- `Virtual Account` Non-SNAP sudah dikonfigurasi manual untuk notification URL.
- `Convenience Store` aktif sudah dikonfigurasi manual untuk notification URL.
- `QRIS` per 2026-04-28 sudah terlihat `Active` dari sisi channel dan notify URL merchant.
- Smoke test tiket via `QRIS` pada 2026-04-29 berhasil memakai ShopeePay, sehingga QRIS sudah tervalidasi untuk flow tiket real.
- `PayLater` seperti Akulaku sengaja tidak dibuka dulu.
- `e-Wallet` tidak menyediakan pola konfigurasi yang sama seperti `Virtual Account`; menu tersebut cenderung membawa operator ke halaman aktivasi service, bukan halaman configure notification.
- Pada sesi 2026-04-25, `DOKU e-Wallet` terlihat aktif, tetapi channel pihak ketiga seperti DANA / OVO / LinkAja masih disabled / tidak selectable.
- Untuk channel seperti ShopeePay dan e-Wallet pihak ketiga lain, prinsip operasionalnya sama: selama belum aktif / selectable / approved di dashboard merchant, channel tidak dianggap siap launch.
- Karena itu, e-Wallet tidak dijadikan jalur utama smoke test production pertama.

#### Jawaban konkret jika client / bos bertanya kenapa metode pembayaran masih dibatasi per 2026-04-25

- Pembatasan ini **sengaja** dilakukan sebagai risk control saat cutover dari sandbox ke akun official, bukan karena repo gagal membuat checkout.
- Sebagian besar service merchant DOKU saat ini aktif dalam varian `SNAP`, sedangkan repo Spark Stage per 2026-04-25 masih diperlakukan aman untuk jalur `Non-SNAP` terlebih dahulu.
- Webhook repo saat ini belum dijadikan basis launch publik untuk channel `SNAP`, sehingga channel `SNAP` belum dibuka ke user agar status payment tidak ambigu saat live.
- Untuk e-Wallet pihak ketiga seperti DANA / OVO / ShopeePay dkk, status dashboard merchant menunjukkan pola `Hold On / service is not activated yet / Activate Now` atau channel disabled, yang diartikan sebagai channel belum fully activated / belum approved / belum selectable dari sisi akun merchant.
- Karena channel tersebut belum fully usable dari dashboard merchant, operator juga belum mendapat jalur konfigurasi notification yang setara dengan `Virtual Account` Non-SNAP.
- Metode yang dibuka lebih dulu hanyalah metode yang memenuhi tiga syarat:
  - channel merchant aktif dan bisa dikonfigurasi
  - notification URL bisa diarahkan ke endpoint production yang benar
  - flow channel tersebut cocok dengan kemampuan repo saat ini
- Jadi jawaban paling singkat untuk pihak non-teknis adalah:
  - **opsi pembayaran masih dibatasi karena akun official DOKU baru dicutover, banyak channel merchant masih SNAP atau belum fully activated, dan tim sengaja membuka jalur yang paling aman dulu agar transaksi uang asli tidak masuk ke flow yang belum tervalidasi penuh**

### C. Scope payment methods fase awal

- [x] Putuskan daftar payment methods yang aman untuk launch awal
- [ ] Utamakan channel yang tidak butuh payload tambahan yang belum tersedia di repo
- [ ] Jangan aktifkan semua channel sekaligus hanya karena tersedia di dashboard
- [ ] Jika perlu, implementasikan `payment.payment_method_types` agar checkout page hanya menampilkan metode yang sengaja dipilih
- [ ] Review apakah channel paylater / direct debit / Jenius butuh field tambahan yang belum dikirim repo

Channel launch awal yang diprioritaskan:

- Virtual Account Non-SNAP BNI untuk live smoke test pertama
- Convenience Store sebagai backup jalur pembayaran
- QRIS sudah aktif dan sudah lolos smoke test tiket production via ShopeePay pada 2026-04-29
- Channel SNAP belum dijadikan target launch awal sampai code mendukung notification dan signature SNAP dengan benar

### D. Hardening code sebelum full launch

- [x] Tambahkan tracking `provider_status` yang eksplisit pada persistence order
- [x] Pastikan `request_id` DOKU tersimpan dan bisa diaudit per payment attempt
- [x] Tangani `409 Conflict` dengan jalur retry / recovery yang jelas
- [x] Samakan sanitasi payload produk dengan tiket
- [ ] Pertimbangkan verifikasi response signature dari DOKU pada create checkout
- [ ] Pastikan frontend dan backend tidak bisa beda mode tanpa terdeteksi
- [x] Rapikan `.env.example` agar tidak lagi memberi contoh Midtrans sebagai source of truth

### E. Sandbox verification yang masih perlu dibuktikan

- [ ] Uji success notification sandbox dan pastikan order berubah final lewat webhook
- [ ] Uji expired flow sandbox
- [ ] Uji failed / cancelled flow sandbox
- [ ] Uji retry notification sandbox
- [ ] Uji idempotency create payment dengan `Request-Id` yang sama
- [ ] Uji polling fallback bila notification terlambat
- [ ] Uji release stok produk pada status final non-paid
- [ ] Uji release kapasitas tiket pada status final non-paid
- [ ] Uji voucher usage dan voucher release pada hasil akhir yang relevan

### F. Smoke test production dengan uang asli kecil

- [x] Siapkan 1 tiket test harga kecil untuk transaksi live
- [x] Siapkan 1 produk test harga kecil untuk transaksi live
- [x] Pastikan item test tidak membingungkan user publik
- [x] Jalankan 1 transaksi live tiket nominal kecil
- [x] Jalankan 1 transaksi live produk nominal kecil
- [x] Jalankan 1 transaksi live tiket via QRIS
- [ ] Simpan order number dari kedua transaksi
- [x] Verifikasi user diarahkan ke checkout page production, bukan sandbox
- [x] Verifikasi payment selesai di sisi DOKU
- [x] Verifikasi webhook masuk ke endpoint production
- [x] Verifikasi order DB berubah ke status final yang benar
- [x] Verifikasi tiket benar-benar terbit untuk transaksi tiket
- [x] Verifikasi pickup / order artifact benar untuk transaksi produk
- [x] Verifikasi stok tidak tertahan setelah transaksi final
- [x] Verifikasi voucher tidak rusak bila voucher ikut terlibat

Catatan smoke test production 2026-04-25:

- Tiket live test via akun official DOKU berhasil.
- Produk live test via akun official DOKU berhasil.
- Flow bayar kasir produk juga berhasil.
- Akun yang dipakai untuk pengujian manual: `pradawashere@gmail.com`.
- Jalur awal yang dipakai tetap dibatasi ke scope payment method fase awal.
- Redirect `localhost` yang sempat muncul pada percobaan awal sudah diperbaiki dan percobaan berikutnya berhasil kembali ke domain production.
- Tiket hasil transaksi live berhasil dipindai oleh admin, sehingga bukti operasional saat ini tidak hanya berhenti pada status paid.
- Produk hasil transaksi live sudah bisa dibeli dan flow pasca-bayarnya dinyatakan lolos manual.

Catatan smoke test QRIS production 2026-04-29:

- Pembelian tiket via QRIS berhasil menggunakan ShopeePay.
- Transaksi dilakukan pada flow real / akun official DOKU.
- Dokumentasi hasil smoke test sudah disimpan operator dalam bentuk foto.
- Status QRIS sekarang sudah tervalidasi untuk flow tiket real, tetapi belum otomatis mengklaim flow produk via QRIS sampai dilakukan test produk khusus QRIS.

### G. Audit database setelah smoke test

- [x] Cek `orders` untuk transaksi tiket live test
- [x] Cek `order_items` dan `purchased_tickets` untuk memastikan ticket issuance berhasil
- [x] Cek `order_products` untuk transaksi produk live test
- [x] Cek `order_product_items` dan `product_variants.reserved_stock`
- [x] Cek `webhook_logs` untuk memastikan event terekam
- [x] Cek tidak ada order `paid` yang kehilangan side effect
- [x] Cek tidak ada order expired / cancelled yang masih menahan stock atau capacity

### H. Keputusan go / no-go

- [x] Jika 2 transaksi live kecil lolos end-to-end, lanjutkan soft launch
- [ ] Jika webhook gagal, tahan cutover publik dan perbaiki notification path dulu
- [ ] Jika stok / kapasitas / ticket issuance tidak sinkron, tahan launch publik
- [ ] Jika checkout page masih membuka sandbox asset, rollback env frontend dan perbaiki segera
- [ ] Setelah stabil, baru aktifkan item / harga normal untuk user publik

## Urutan Eksekusi Yang Benar

Urutan kerja yang disepakati dari hasil diskusi operator vs agent:

1. Operator lebih dulu menyelesaikan prasyarat dashboard / hosting / credential yang memang tidak bisa dikerjakan agent.
2. Setelah prasyarat operator cukup, baru agent mengerjakan hardening code, config, dan test automation.
3. Setelah perubahan agent selesai dan diverifikasi, operator menjalankan live smoke test nominal kecil.
4. Setelah smoke test lolos, baru diputuskan go / no-go untuk soft launch.

Status urutan saat ini:

- tahap operator awal: sebagian besar sudah berjalan
- tahap agent: sudah dikerjakan dan hasil utamanya sudah di-deploy
- tahap smoke test production: tiket dan produk sudah lolos manual

## Backlog Agent Berikutnya

Bagian ini adalah task yang memang sengaja ditahan untuk dikerjakan agent setelah prasyarat operator awal cukup.

### Agent 1 - Backend Payment Hardening

- [x] Tambahkan `provider_status`
- [x] Pastikan tracking payment attempt dan `request_id` bisa diaudit
- [x] Tangani `409 Conflict` dengan recovery yang jelas
- [x] Samakan sanitasi payload produk dengan tiket
- [ ] Tinjau kemungkinan verifikasi response signature DOKU

### Agent 2 - Frontend / Config / Docs Consistency

- [x] Rapikan `.env.example` agar source of truth sudah DOKU
- [x] Pastikan docs menjelaskan perbedaan flag internal repo vs parameter resmi DOKU
- [ ] Tambahkan guard / dokumentasi agar frontend dan backend tidak beda mode tanpa terdeteksi
- [x] Rapikan runbook cutover production
- [ ] Tinjau implementasi pembatasan payment methods dari sisi code / payload, bukan dashboard saja

### Agent 3 - Tests / Verification / Audit Support

- [ ] Tambahkan test success notification
- [ ] Tambahkan test expired flow
- [ ] Tambahkan test failed / cancelled flow
- [ ] Tambahkan test retry notification
- [ ] Tambahkan test idempotency `Request-Id`
- [ ] Tambahkan test polling fallback
- [ ] Tambahkan test release stok / kapasitas / voucher
- [ ] Siapkan query audit DB dan checklist smoke test production

## Gap Tertinggi Yang Masih Terbuka

Hasil audit terbaru menunjukkan 5 gap tertinggi sebelum live smoke test:

1. Pembatasan channel dari sisi payload masih belum eksplisit; `payment.payment_method_types` belum dipakai untuk memastikan user hanya melihat channel yang memang siap.
2. Webhook success / retry / replay idempotency belum punya bukti automated test yang cukup.
3. Sync dan reconciliation saat webhook terlambat atau tidak datang belum punya bukti test end-to-end yang cukup.
4. Invariant side effect untuk ticket issuance, release capacity, pickup, voucher, dan reserved stock masih perlu bukti test yang lebih kuat.
5. Dukungan SNAP masih belum siap dibuka ke publik; selama itu belum dikerjakan, scope launch awal harus tetap dibatasi ke jalur non-SNAP / channel yang benar-benar terverifikasi.

## Prioritas Backlog Per 2026-04-25

| Prioritas | Fokus | Item |
| --- | --- | --- |
| Urgent | Hardening sebelum pembukaan scope lebih lebar | Implementasi `payment.payment_method_types` agar channel launch awal benar-benar terkunci dari payload, tambah test webhook retry / replay idempotency, tambah test delayed webhook untuk sync dan reconciliation, tambah test invariant side effect untuk tiket, produk, voucher, stock, dan capacity |
| Medium | Operasional awal live dan guard tambahan | Tambah guard / alert jika mode frontend-backend mismatch, dokumentasikan payment methods publik yang benar-benar dibuka, simpan order number smoke test dan bukti audit operasional, siapkan langkah retry manual yang lebih ringkas untuk operator |
| Nice to have | Cleanup pasca-cutover | Arsipkan / hapus edge function Midtrans lama, rapikan secret Midtrans yang sudah obsolete, rotate credential yang sempat terekspos di luar secret manager, review kemungkinan verifikasi response signature DOKU pada create checkout |

## Checklist Monitoring Early-Live

Checklist ini dipakai operator pada 24-72 jam awal setelah soft launch terbatas.

### Per transaksi awal

- Pastikan user benar-benar diarahkan ke checkout production DOKU, bukan sandbox.
- Pastikan status order final di app berubah tanpa menunggu intervensi manual yang berulang.
- Pastikan tiket live test bisa dipindai admin.
- Pastikan order produk live test memiliki pickup / artifact yang benar.
- Pastikan tidak ada reserved stock atau capacity yang tertahan setelah status final non-pending.

### Per 1-2 jam pada hari pertama

- Cek ada atau tidak order `pending` yang lewat dari expiry lokal tetapi belum dipulihkan reconciliation.
- Cek tidak ada order `paid` yang kehilangan ticket issuance atau pickup artifact.
- Cek `webhook_logs` untuk memastikan event DOKU tetap masuk normal.
- Cek cron reconciliation dan expiry masih terdaftar dan berjalan.

### Query audit cepat

```sql
select order_number, status, expires_at
from orders
where status = 'pending'
  and expires_at < now()
order by expires_at asc;

select order_number, status, payment_status, payment_expired_at
from order_products
where status not in ('completed', 'cancelled', 'expired')
  and payment_status <> 'paid'
  and payment_expired_at < now()
order by payment_expired_at asc;

select order_number, payment_status, pickup_code
from order_products
where payment_status = 'paid'
  and pickup_code is null;

select o.order_number
from orders o
left join order_items oi on oi.order_id = o.id
left join purchased_tickets pt on pt.order_item_id = oi.id
where o.status = 'paid'
group by o.order_number
having count(pt.id) = 0;
```

### I. Setelah live stabil

- [ ] Hapus atau arsipkan function Midtrans lama di remote
- [ ] Rapikan secret Midtrans yang tidak lagi dipakai
- [ ] Catat hasil smoke test production di dokumen ini
- [ ] Catat payment methods yang benar-benar dibuka ke publik
- [ ] Jika credential sempat tersebar di luar secret manager, lakukan rotation

## Phase 9 - Cleanup pasca cutover

- [x] Hapus tombol, util, dan flow frontend khusus Midtrans yang tidak dipakai lagi
- [ ] Arsipkan atau hapus edge function Midtrans yang sudah obsolete
- [x] Rapikan docs dan runbook payment agar DOKU jadi source of truth baru
- [x] Tambahkan troubleshooting doc untuk tim client / programmer internal

Checkpoint:

- codebase tidak menyisakan flow payment ganda yang membingungkan
- dokumentasi operasional sudah pindah ke DOKU

## Cleanup Plan Non-Blocking

Bagian ini sengaja ditandai non-blocking. Jalankan setelah soft launch stabil, bukan sebagai syarat smoke test atau validasi transaksi uang asli awal.

### Midtrans decommissioning

- [ ] Inventaris terakhir function, cron, dan secret Midtrans yang masih tersisa di remote
- [ ] Arsipkan atau hapus edge function `midtrans-*` yang sudah tidak dipakai
- [ ] Hapus cron atau scheduler Midtrans yang benar-benar obsolete
- [ ] Pastikan README, runbook, dan dashboard operasional tidak lagi menyebut Midtrans sebagai jalur aktif

### Credential rotation

- [ ] Rotate credential DOKU yang sempat dibagikan di luar secret manager
- [ ] Update Supabase secret setelah rotation
- [ ] Verifikasi checkout production tetap berjalan setelah rotation
- [ ] Catat tanggal rotation dan operator yang menjalankan

## Risiko yang Harus Dijaga

- Jangan percaya redirect frontend sebagai bukti pembayaran final
- Jangan memproses notification tanpa verifikasi signature
- Jangan membuat side effect payment tanpa idempotency
- Jangan membiarkan create payment gagal tetapi stok / kapasitas tetap tertahan
- Jangan membuat parser notification strict terhadap field-field DOKU
- Jangan mengandalkan check status sebagai pengganti webhook

## Referensi Resmi DOKU

- DOKU API home: https://developers.doku.com/
- Retrieve payment credential: https://developers.doku.com/getting-started-with-doku-api/retrieve-payment-credential
- DOKU Checkout overview: https://developers.doku.com/accept-payments/doku-checkout
- DOKU Checkout integration guide: https://developers.doku.com/accept-payments/doku-checkout/integration-guide
- Backend integration: https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration
- Frontend integration: https://developers.doku.com/accept-payments/doku-checkout/integration-guide/frontend-integration
- Supported payment methods: https://developers.doku.com/accept-payments/doku-checkout/supported-payment-methods
- Order status for checkout page: https://developers.doku.com/accept-payments/doku-checkout/order-status-for-checkout-page
- Idempotency request: https://developers.doku.com/get-started-with-doku-api/idempotency-request
- Notification overview: https://developers.doku.com/get-started-with-doku-api/notification
- Setup notification URL: https://developers.doku.com/get-started-with-doku-api/notification/setup-notification-url
- Retry notification: https://developers.doku.com/get-started-with-doku-api/notification/retry-notification
- Override notification URL: https://developers.doku.com/get-started-with-doku-api/notification/override-notification-url
- HTTP notification sample for SNAP: https://developers.doku.com/get-started-with-doku-api/notification/http-notification-sample-for-snap
- HTTP notification sample non-SNAP: https://developers.doku.com/get-started-with-doku-api/notification/http-notification-sample-non-snap
- Signature component non-SNAP request header: https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-component-from-request-header
- SNAP signature overview: https://developers.doku.com/get-started-with-doku-api/signature-component/snap
- SNAP asymmetric signature: https://developers.doku.com/get-started-with-doku-api/signature-component/snap/asymmetric-signature
- SNAP symmetric signature: https://developers.doku.com/get-started-with-doku-api/signature-component/snap/symmetric-signature

## Penilaian Progress Migrasi

Per 2026-04-25 setelah batch hardening dan deploy terakhir, estimasi progress migrasi Midtrans ke DOKU dinaikkan menjadi **89%**.

Tambahan per 2026-04-29:

- QRIS sudah aktif di merchant DOKU dan smoke test tiket production via QRIS ShopeePay sudah berhasil.
- Progress fungsional payment naik karena channel QRIS tidak lagi hanya aktif di dashboard, tetapi sudah punya bukti transaksi tiket real.

Penjelasannya:

- **Sekitar 92% untuk cutover fungsional / bisnis**
  - tiket sudah bisa dibeli di akun official DOKU
  - tiket hasil transaksi live sudah bisa dipindai admin
  - produk sudah bisa dibeli di akun official DOKU
  - flow bayar kasir produk juga sudah lolos
  - webhook, redirect balik ke app, dan side effect utama sudah terbukti jalan pada smoke test terbatas

- **Sekitar 84% untuk engineering completion / hardening penuh**
  - pembatasan payment methods dari sisi payload / code sekarang sudah dipasang untuk scope launch awal
  - guard mode production vs sandbox sudah ditambahkan agar mismatch lebih cepat terdeteksi
  - automated test coverage untuk webhook replay, transition regression, dan sebagian helper sync/status sudah bertambah
  - query audit dan runbook early-live sudah dirapikan
  - namun test automation end-to-end untuk retry, delayed webhook, sync/reconciliation, dan invariant side effect lintas tabel masih belum lengkap
  - channel `SNAP` tetap belum siap dibuka ke publik
  - cleanup akhir function / secret Midtrans lama belum selesai

Kesimpulan praktis:

- progress memang **naik sedikit** dari 85% ke 89% karena backlog kritis untuk scope launch awal sudah berkurang
- untuk **soft launch terbatas**, migrasi ini sudah sangat dekat selesai dan layak dipakai
- untuk disebut **100% selesai secara engineering**, masih ada pekerjaan hardening, test automation, dan cleanup pasca-cutover
