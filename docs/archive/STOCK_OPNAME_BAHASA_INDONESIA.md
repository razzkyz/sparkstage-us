# Sistem Stock Opname Baru - Penjelasan Lengkap

## 🎯 Apa Yang Sudah Dibangun?

Sistem stock opname yang baru sudah selesai dibangun di level **backend (database + API)**. 

Yang sudah jadi:
- ✅ **Database lengkap** - 6 tabel baru untuk tracking stock
- ✅ **API Functions lengkap** - 9 fungsi untuk semua operasi
- ✅ **TypeScript Hooks** - Siap pakai untuk frontend
- ✅ **Dokumentasi lengkap** - Panduan penggunaan & troubleshooting

Yang belum (next step):
- ⏳ **Frontend pages** - Halaman admin untuk input data
- ⏳ **Testing** - Test end-to-end flow
- ⏳ **Training staff** - Pelatihan cara pakai

## 📊 Sistem Seperti Apa?

### Flow Harian (Contoh Real)

**Tanggal: 9 Juni 2026**  
**Produk: Kaos Brand X, Size M - Putih**

#### 🌅 PAGI (09:00) - Stock Opening
```
Staff input stock awal hari ini: 10 pcs
```

#### 🌞 SIANG (11:00 - 19:00) - Operasional
**Penjualan (Otomatis tercatat):**
- 11:00 - Kasir jual 3 pcs
- 14:00 - Online jual 2 pcs  
- 16:00 - Kasir jual 2 pcs
- **Total terjual: 7 pcs** ✅ Otomatis tercatat dari kasir/website!

**Adjustment Manual (Staff input dengan alasan):**
- 15:00 - Gift untuk KOL: -3 pcs
  - Alasan: "Gift untuk @influencer_xyz campaign Juni 2026"
  - ✅ Stock di database langsung -3 otomatis!

#### 🌙 MALAM (20:00) - Stock Opname
**System otomatis hitung:**
```
Stock Awal:           10 pcs
Terjual (Total):      -7 pcs  (otomatis dari kasir/online)
Adjustment (Gift):    -3 pcs  (manual input tadi siang)
─────────────────────────────
Stock System:          0 pcs
```

**Staff cek fisik:**
```
Hitung actual:         1 pcs  (staff count barang actual)
─────────────────────────────
Selisih (Variance):   +1 pcs  (lebih 1 dari system)
Alasan Selisih:       "1 pcs return dari customer kemarin, belum tercatat"
```

**Kesimpulan:**  
Ada selisih +1 pcs. Besok bisa bikin adjustment "gain" +1 untuk balance.

## 🏗️ Struktur System

### 1. Stock Opening (Stock Awal Harian)
**Kapan:** Setiap pagi sebelum buka  
**Siapa:** Admin/Staff  
**Input:** Stock awal untuk setiap produk variant

**Contoh:**
```
Tanggal: 9 Juni 2026
Produk: Kaos Brand X, Size M Putih
Stock Awal: 10 pcs
```

**Status:**
- `draft` = Masih bisa diedit
- `confirmed` = Sudah dikunci, dipakai untuk kalkulasi

### 2. Stock Adjustments (Perubahan Manual)
**Kapan:** Kapanpun ada perubahan manual  
**Siapa:** Admin/Staff  
**Wajib:** Input alasan!

**Tipe Adjustment:**
- **Gift** = Hadiah untuk customer/partner
- **KOL** = Marketing untuk influencer
- **Loss** = Kehilangan/rusak/hilang
- **Gain** = Penambahan/return/ketemu lagi
- **Other** = Lainnya

**Contoh:**
```
Tanggal: 9 Juni 2026
Tipe: Gift
Produk: Kaos Brand X, Size M Putih
Jumlah: -3 pcs (minus = kurang)
Alasan: "Gift untuk KOL @influencer_xyz campaign Juni 2026"
```

**Efek:** Stock di database langsung update otomatis -3 pcs!

### 3. Sales (Penjualan) - OTOMATIS!
**Kapan:** Setiap ada transaksi kasir/online  
**Siapa:** System otomatis  
**Input:** Tidak perlu input manual!

System otomatis tracking dari:
- Order kasir yang sudah bayar
- Order online yang sudah bayar
- Status: `payment_status = 'paid'`

**Contoh:**
```
11:00 - Kasir scan QR, customer bayar → System catat -3 pcs
14:00 - Customer order online, bayar → System catat -2 pcs
16:00 - Kasir scan QR, customer bayar → System catat -2 pcs

Total otomatis tercatat: -7 pcs
```

### 4. Stock Opname (Physical Count)
**Kapan:** Akhir hari (misal jam 20:00)  
**Siapa:** Admin/Staff  
**Input:** 
1. System auto-hitung stock system
2. Staff input stock fisik actual
3. System hitung selisih

**Contoh:**
```
SYSTEM AUTO-HITUNG:
Stock Awal:           10 pcs  (dari stock opening pagi)
Terjual:              -7 pcs  (dari kasir/online, otomatis!)
Adjustment:           -3 pcs  (dari adjustment gift siang)
─────────────────────────────
Stock System:          0 pcs

STAFF INPUT:
Stock Fisik:           1 pcs  (actual count barang di gudang)
─────────────────────────────
Selisih:              +1 pcs  (lebih 1 dari system)
Alasan Selisih:       "1 pcs return kemarin belum tercatat"
```

**Status:**
- `draft` = Masih bisa diedit
- `finalized` = Sudah dikunci, variance tercatat

## 💡 Keuntungan System Baru

### 1. Otomatis Tracking Penjualan
**Dulu:** Harus input manual berapa terjual  
**Sekarang:** Otomatis dari kasir/website!

### 2. Clear Audit Trail
**Dulu:** Tidak jelas stock berkurang kenapa  
**Sekarang:** 
- Terjual berapa? ✅ Jelas dari transaksi
- Gift berapa? ✅ Jelas dari adjustment dengan alasan
- Hilang berapa? ✅ Jelas dari adjustment dengan alasan

### 3. Variance Analysis
**Dulu:** Tidak ada perbandingan system vs actual  
**Sekarang:** 
- Stock system terhitung otomatis
- Compare dengan stock fisik
- Jelas selisihnya berapa dan kenapa

### 4. Better Accountability
**Dulu:** Tidak jelas siapa yang ubah stock  
**Sekarang:**
- Siapa buat opening? ✅ Tercatat
- Siapa buat adjustment? ✅ Tercatat
- Siapa buat opname? ✅ Tercatat
- Alasan adjustment? ✅ Wajib input

## 📱 Cara Pakai (Workflow Harian)

### PAGI (09:00) - Opening
1. Admin buka halaman "Stock Opening"
2. Klik "Buat Stock Opening Hari Ini"
3. Pilih produk & variant
4. Input stock awal setiap item
5. Save as draft (masih bisa edit)
6. Klik "Confirm Opening" → Locked, dipakai untuk kalkulasi

### SIANG (Operasional)
**Penjualan:**
- Kasir scan QR, customer bayar → OTOMATIS tercatat ✅
- Online order, customer bayar → OTOMATIS tercatat ✅
- **Tidak perlu input manual!**

**Adjustment:**
- Ada gift untuk influencer?
  1. Buka halaman "Stock Adjustments"
  2. Klik "Buat Adjustment"
  3. Pilih tipe: "Gift"
  4. Pilih produk & jumlah: -3 pcs
  5. **Wajib input alasan:** "Gift untuk @influencer_xyz"
  6. Save → Stock update otomatis -3 pcs ✅

- Ada barang rusak?
  1. Buka halaman "Stock Adjustments"
  2. Klik "Buat Adjustment"
  3. Pilih tipe: "Loss"
  4. Pilih produk & jumlah: -2 pcs
  5. **Wajib input alasan:** "2 pcs rusak basah kena air"
  6. Save → Stock update otomatis -2 pcs ✅

### MALAM (20:00) - Opname
1. Admin buka halaman "Stock Opname"
2. Klik "Buat Stock Opname Hari Ini"
3. **System otomatis load:**
   - Stock awal (dari opening pagi)
   - Terjual (dari kasir/online)
   - Adjustment (dari adjustment siang)
   - **Stock system = Awal - Terjual + Adjustment**
4. Staff hitung fisik actual
5. Staff input "Physical Count"
6. **System auto-hitung selisih** = Physical - System
7. Jika ada selisih, **wajib input alasan**
8. Save opname
9. (Optional) Klik "Finalize" → Locked

## 🔢 Contoh Lengkap Step-by-Step

### Produk: Kaos Brand X, Size M Putih

**PAGI (09:00)**
```
Action: Create Stock Opening
Input:
  Tanggal: 9 Juni 2026
  Produk: Kaos Brand X, Size M Putih
  Stock Awal: 10 pcs
Status: Confirmed ✅
```

**SIANG (11:00)**
```
Action: Kasir Scan QR
Customer bayar 3 kaos
System: Otomatis catat -3 pcs ✅
(Tidak perlu input manual!)
```

**SIANG (14:00)**
```
Action: Online Order
Customer order 2 kaos, bayar via DOKU
System: Otomatis catat -2 pcs ✅
(Tidak perlu input manual!)
```

**SIANG (15:00)**
```
Action: Create Adjustment
Input:
  Tipe: Gift
  Produk: Kaos Brand X, Size M Putih
  Jumlah: -3 pcs
  Alasan: "Gift untuk KOL @influencer_xyz campaign Juni 2026"
Effect: Stock update otomatis -3 pcs ✅
```

**SIANG (16:00)**
```
Action: Kasir Scan QR
Customer bayar 2 kaos
System: Otomatis catat -2 pcs ✅
(Tidak perlu input manual!)
```

**MALAM (20:00) - Stock Opname**
```
Action: Create Stock Opname

SYSTEM AUTO-CALCULATE:
  Stock Awal:        10 pcs  (dari opening jam 09:00)
  Terjual:           -7 pcs  (3+2+2 dari kasir/online, otomatis!)
  Adjustment:        -3 pcs  (gift jam 15:00)
  ────────────────────────
  Stock System:       0 pcs

STAFF INPUT:
  Physical Count:     1 pcs  (staff count actual di gudang)
  ────────────────────────
  Variance:          +1 pcs  (lebih 1 dari system)
  
Alasan Selisih: "1 pcs return dari customer kemarin, belum tercatat"

Status: Finalized ✅
```

**BESOK PAGI (Tindak Lanjut)**
```
Action: Create Adjustment
Input:
  Tipe: Gain
  Produk: Kaos Brand X, Size M Putih
  Jumlah: +1 pcs
  Alasan: "Reconcile variance kemarin, return customer sudah tercatat"
Effect: Stock update +1 pcs, sekarang balance ✅
```

## 🚀 Status Implementasi

### ✅ Sudah Selesai (Backend)
- [x] Database schema lengkap (6 tabel)
- [x] API functions lengkap (9 fungsi)
- [x] Auto-numbering (#open-00001, #adj-00001, #opname-00001)
- [x] Auto-tracking penjualan dari kasir/online
- [x] Auto-update stock saat adjustment
- [x] Auto-kalkulasi system stock
- [x] Variance calculation
- [x] Permissions & security (admin only)
- [x] TypeScript hooks untuk frontend
- [x] Dokumentasi lengkap

### ⏳ Belum (Frontend)
- [ ] Halaman "Stock Opening"
- [ ] Halaman "Stock Adjustments"
- [ ] Revamp halaman "Stock Opname"
- [ ] Testing end-to-end
- [ ] Training staff
- [ ] Go-live

## 🎓 Yang Perlu Dilatih ke Staff

1. **Disiplin Opening Pagi**
   - **WAJIB** buat opening setiap pagi
   - **WAJIB** confirm sebelum mulai jual
   - Kalau lupa, kalkulasi siang jadi salah!

2. **Real-time Adjustment**
   - **LANGSUNG** buat adjustment pas kejadian
   - Jangan ditunda sampai malam
   - **WAJIB** input alasan yang jelas

3. **Accurate Physical Count**
   - Hitung dengan teliti saat opname
   - Double-check item mahal/high-value
   - Report selisih dengan jujur

4. **Clear Reasons**
   - Alasan adjustment harus spesifik
   - ❌ BAD: "untuk marketing"
   - ✅ GOOD: "Gift untuk KOL @influencer_xyz campaign Juni 2026"

## 📞 Pertanyaan?

**Q: Kalau lupa bikin opening pagi gimana?**  
A: System stock calculation jadi salah. Harus tetap disiplin bikin opening setiap pagi.

**Q: Kalau ada selisih di opname, harus gimana?**  
A: 
1. Input alasan selisihnya
2. Investigate kenapa bisa beda
3. Besok pagi buat adjustment untuk reconcile
4. Kalau selisih sering, perlu investigasi lebih dalam

**Q: Apakah penjualan kasir otomatis tercatat?**  
A: YA! Asal order status = 'paid', otomatis masuk ke kalkulasi. Tidak perlu input manual.

**Q: Kalau gift/loss tidak dicatat real-time gimana?**  
A: System stock jadi tidak akurat. Makanya harus dicatat langsung pas kejadian, dengan alasan yang jelas.

## 🎯 Next Steps

1. **Developer:** Implement frontend pages
2. **Test:** Full end-to-end workflow
3. **Training:** Latih admin & staff cara pakai
4. **Soft Launch:** Test 1 minggu
5. **Review:** Perbaiki kalau ada issue
6. **Go Live:** Full launch

---

**Kesimpulan:**  
System backend sudah 100% siap. Tinggal bikin halaman admin untuk input data, test, training staff, dan go-live! 🚀
