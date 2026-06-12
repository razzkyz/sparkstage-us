# 📦 Cara Pakai Stock Management System

**Panduan lengkap untuk Staff SparkStage**

---

## 🌅 1. STOCK OPENING (Pagi Hari)

### Kapan Buat Stock Opening?
- **Setiap pagi** sebelum toko buka
- **Sebelum** ada penjualan
- **Wajib** dilakukan untuk bisa stock opname nanti

### Langkah-langkah:

#### **Step 1: Buka Menu Stock Opening**
1. Login ke admin panel
2. Klik menu **"Toko"** atau **"Inventaris"** di sidebar
3. Klik **"Stock Opening"**

#### **Step 2: Klik Tombol "Buat Stock Opening"**
- Ada di kanan atas halaman
- Tombol pink/merah dengan icon **+**

#### **Step 3: Isi Form Stock Opening**

![Form akan muncul seperti ini]

**A. Tanggal Opening** (Required)
- Pilih tanggal hari ini
- Contoh: `09 Juni 2026`

**B. Lokasi** (Required)
- Default: `SparkStage55`
- Bisa diganti kalau ada lokasi lain

**C. Catatan** (Optional)
- Bisa kosong
- Contoh: "Opening pagi hari, kondisi normal"

**D. Tambah Produk**
- Ketik nama produk atau SKU di kolom pencarian
- Contoh: ketik "Kaos" atau "SKU-001"
- Klik produk dari hasil pencarian

**E. Isi Quantity untuk Setiap Produk**

Setelah pilih produk, akan muncul form untuk setiap item:
- **Product Name**: Nama produk (otomatis)
- **Variant**: Variant produk (otomatis)
- **SKU**: Kode SKU (otomatis)
- **Quantity**: ⚠️ **ISI INI!** - Berapa stock fisik saat pagi hari?
  - Contoh: Kalau ada 10 pcs, isi `10`
- **Catatan Item**: Optional, kalau ada catatan khusus

**F. Tambah Item Lain**
- Klik tombol pencarian lagi untuk tambah produk lain
- Ulangi sampai semua produk sudah diinput

#### **Step 4: Klik "Buat Stock Opening"**
- Tombol di bawah form
- Tunggu beberapa detik
- Akan muncul notifikasi sukses: ✅ "Stock opening #open-00001 berhasil dibuat!"

#### **Step 5: Selesai!**
- Stock opening sudah tersimpan
- Nomor opening: `#open-00001`, `#open-00002`, dst.
- Bisa dilihat di list atau detail page

---

## 🔧 2. STOCK ADJUSTMENTS (Siang Hari - Kalau Ada)

### Kapan Buat Stock Adjustment?
- **Kalau ada** perubahan stock manual
- **Bukan** dari penjualan (penjualan otomatis tercatat)

### Tipe Adjustment:

#### **A. Gift** 🎁
- Stock dikasih gratis ke customer
- Contoh: Promo beli 2 gratis 1

#### **B. KOL** 📸
- Stock diberikan ke KOL/influencer untuk marketing
- Contoh: 5 pcs kaos untuk KOL Instagram

#### **C. Loss** ❌
- Stock hilang/rusak/expired
- Contoh: Produk rusak, hilang, dicuri

#### **D. Gain** ✅
- Stock bertambah (bukan dari pembelian)
- Contoh: Ketemu stock yang hilang, koreksi data

#### **E. Other** 📝
- Adjustment lainnya
- Contoh: Transfer antar lokasi

### Langkah-langkah:

#### **Step 1: Buka Menu Stock Adjustments**
1. Klik menu **"Toko"** atau **"Inventaris"** 
2. Klik **"Stock Adjustments"**

#### **Step 2: Klik "Buat Stock Adjustment"**

#### **Step 3: Isi Form Adjustment**

**A. Tanggal Adjustment** (Required)
- Pilih tanggal hari ini

**B. Tipe Adjustment** (Required)
- Pilih salah satu: Gift / KOL / Loss / Gain / Other

**C. Alasan** (Required - Min 10 karakter)
- ⚠️ **WAJIB ISI!** Minimal 10 huruf
- Contoh:
  - ✅ GOOD: "Diberikan ke KOL @instagram_user untuk promosi"
  - ✅ GOOD: "Produk rusak karena terkena air hujan"
  - ❌ BAD: "Gift" (terlalu pendek)
  - ❌ BAD: "KOL" (terlalu pendek)

**D. Lokasi** (Required)
- Default: `SparkStage55`

**E. Catatan** (Optional)
- Catatan tambahan kalau perlu

**F. Tambah Produk & Quantity Change**

- Pilih produk dari pencarian
- **Quantity Change**: 
  - Untuk **pengurangan** (Gift, KOL, Loss): isi angka **negatif**
    - Contoh: `-5` (stock berkurang 5)
  - Untuk **penambahan** (Gain): isi angka **positif**
    - Contoh: `+3` (stock bertambah 3)

#### **Step 4: Klik "Buat Stock Adjustment"**
- Stock akan **otomatis terupdate** di system!
- Nomor adjustment: `#adj-00001`, `#adj-00002`, dst.

---

## ✅ 3. STOCK OPNAME (Malam Hari)

### Kapan Buat Stock Opname?
- **Setiap malam** sebelum tutup
- **Setelah** sudah ada Stock Opening untuk hari ini

### Apa yang Dilakukan?
- Hitung stock fisik di gudang/toko
- Bandingkan dengan perhitungan system
- Kalau beda, harus kasih alasan

### Langkah-langkah:

#### **Step 1: Buka Menu Stock Opname**
1. Klik menu **"Toko"** atau **"Inventaris"**
2. Klik **"Stock Opname"**

#### **Step 2: Klik "Buat Stock Opname"**

#### **Step 3: Isi Form Opname**

**A. Tanggal Opname** (Required)
- Pilih tanggal hari ini (yang sudah ada Stock Opening-nya)

**B. Lokasi** (Required)
- Default: `SparkStage55`
- Harus sama dengan lokasi Stock Opening!

**C. Catatan** (Optional)
- Contoh: "Stock opname malam hari"

#### **Step 4: System Akan Auto-Load Perhitungan**

Setelah pilih tanggal & lokasi, system otomatis menghitung:

```
┌─────────────────────────────────────┐
│ Produk A - Variant Merah            │
├─────────────────────────────────────┤
│ Opening Stock:        10 pcs        │
│ Terjual:              -8 pcs        │
│ Adjustment:           +2 pcs        │
│ ─────────────────────────────────   │
│ System Stock:          4 pcs        │
│                                     │
│ Physical Count: [__] pcs ⚠️ ISI INI │
│                                     │
│ Variance:              0 pcs        │
└─────────────────────────────────────┘
```

#### **Step 5: Input Physical Count**

**Physical Count** = Stock fisik yang dihitung staff

- **Cara**: Hitung stock fisik di rak/gudang
- **Isi**: Masukkan jumlah yang dihitung
- **Contoh**:
  - System Stock: `4 pcs`
  - Physical Count: `4 pcs` → ✅ Match! (Variance = 0)
  - Physical Count: `3 pcs` → ⚠️ Variance = -1 (kurang 1)
  - Physical Count: `5 pcs` → ⚠️ Variance = +1 (lebih 1)

#### **Step 6: Isi Alasan Variance (Kalau Ada Beda)**

**Kalau Variance = 0** (Physical = System):
- Tidak perlu isi alasan
- Item akan ditandai hijau ✅

**Kalau Variance ≠ 0** (Physical ≠ System):
- ⚠️ **WAJIB** isi alasan (min 10 karakter)
- Item akan ditandai orange/merah ⚠️
- Contoh alasan:
  - ✅ GOOD: "Hilang 1 pcs, kemungkinan terselip di gudang"
  - ✅ GOOD: "Diberikan untuk KOL tapi belum diinput adjustment"
  - ✅ GOOD: "Ketemu 2 pcs yang sebelumnya tidak tercatat"
  - ❌ BAD: "Hilang" (terlalu pendek)
  - ❌ BAD: "KOL" (terlalu pendek)

#### **Step 7: Review Summary**

Di atas form ada summary cards:
- **Total Item**: Berapa produk yang di-opname
- **Match**: Berapa item yang physical = system (hijau ✅)
- **Variance**: Berapa item yang beda (orange ⚠️)

#### **Step 8: Klik "Buat Stock Opname"**
- System akan validasi:
  - ✅ Semua physical count sudah diisi
  - ✅ Semua variance sudah ada alasan (kalau beda)
- Sukses: Muncul notifikasi ✅ "Stock opname #opname-00001 berhasil dibuat!"
- Nomor opname: `#opname-00001`, `#opname-00002`, dst.

---

## ⚠️ ERROR MESSAGES & SOLUSI

### Error 1: "Tidak ada stock opening untuk tanggal dan lokasi ini"
**Penyebab**: Belum buat Stock Opening untuk hari ini

**Solusi**:
1. Tutup modal Stock Opname
2. Buka menu **Stock Opening**
3. Buat Stock Opening untuk tanggal hari ini
4. Setelah selesai, balik ke Stock Opname
5. Coba lagi!

### Error 2: "Tambahkan minimal 1 item"
**Penyebab**: Belum pilih produk sama sekali

**Solusi**:
- Tambah minimal 1 produk dari pencarian
- Isi quantity-nya

### Error 3: "Semua item harus memiliki quantity > 0"
**Penyebab**: Ada item dengan quantity 0 atau kosong

**Solusi**:
- Cek semua item
- Pastikan quantity > 0
- Kalau ada yang 0, hapus item tersebut atau isi dengan angka yang benar

### Error 4: "X item dengan variance harus memiliki alasan (min 10 karakter)"
**Penyebab**: Ada item dengan variance tapi alasannya kosong atau terlalu pendek

**Solusi**:
- Scroll ke item yang ditandai orange/merah
- Isi field "Alasan Variance"
- Minimal 10 karakter
- Contoh: "Hilang 2 pcs kemungkinan untuk KOL marketing"

---

## 📊 CONTOH LENGKAP WORKFLOW HARIAN

### **Pagi (08:00)**
Staff A masuk dan membuat Stock Opening:

```
Date: 9 Juni 2026
Location: SparkStage55

Items:
- Kaos Merah L:           10 pcs
- Kaos Biru M:            15 pcs
- Celana Hitam L:          8 pcs
- Topi Baseball Putih:     5 pcs

[Klik "Buat Stock Opening"]
✅ Stock opening #open-00054 berhasil dibuat!
```

### **Siang (12:00)**
Terjadi penjualan:
- Kaos Merah L: 6 pcs terjual (otomatis tercatat)
- Kaos Biru M: 3 pcs terjual (otomatis tercatat)

### **Sore (15:00)**
Staff B memberikan produk ke KOL, buat adjustment:

```
Date: 9 Juni 2026
Type: KOL
Reason: "Diberikan ke KOL @influencer_jakarta untuk promosi Instagram"
Location: SparkStage55

Items:
- Topi Baseball Putih:    -2 pcs

[Klik "Buat Stock Adjustment"]
✅ Stock adjustment #adj-00023 berhasil dibuat!
```

### **Malam (20:00)**
Staff A hitung stock fisik dan buat Stock Opname:

```
Date: 9 Juni 2026
Location: SparkStage55

System Auto-Calculate:

1. Kaos Merah L
   Opening:     10 pcs
   Terjual:     -6 pcs
   Adjustment:   0 pcs
   ─────────────────
   System:       4 pcs
   Physical:     4 pcs ✅ (Input dari staff)
   Variance:     0 pcs → MATCH!

2. Kaos Biru M
   Opening:     15 pcs
   Terjual:     -3 pcs
   Adjustment:   0 pcs
   ─────────────────
   System:      12 pcs
   Physical:    11 pcs ⚠️ (Input dari staff)
   Variance:    -1 pcs → BEDA!
   Reason: "Hilang 1 pcs, tidak ditemukan di gudang" ✅

3. Celana Hitam L
   Opening:      8 pcs
   Terjual:      0 pcs
   Adjustment:   0 pcs
   ─────────────────
   System:       8 pcs
   Physical:     8 pcs ✅ (Input dari staff)
   Variance:     0 pcs → MATCH!

4. Topi Baseball Putih
   Opening:      5 pcs
   Terjual:      0 pcs
   Adjustment:  -2 pcs (KOL)
   ─────────────────
   System:       3 pcs
   Physical:     3 pcs ✅ (Input dari staff)
   Variance:     0 pcs → MATCH!

Summary:
- Total Items: 4
- Match: 3 items ✅
- Variance: 1 item ⚠️

[Klik "Buat Stock Opname"]
✅ Stock opname #opname-00031 berhasil dibuat!
```

**Hasil**: Stock opname selesai, data akurat, besok pagi tinggal buat opening baru!

---

## 💡 TIPS & BEST PRACTICES

### ✅ DO (Lakukan)
1. **Buat Stock Opening setiap pagi** sebelum ada transaksi
2. **Input adjustment langsung** begitu terjadi (gift, KOL, loss)
3. **Hitung fisik dengan teliti** saat opname
4. **Isi alasan yang jelas** untuk variance
5. **Cek summary** sebelum submit
6. **Export XLSX** untuk backup atau laporan

### ❌ DON'T (Jangan)
1. **Jangan skip Stock Opening** - nanti opname tidak bisa
2. **Jangan isi alasan asal-asalan** - harus jelas dan min 10 karakter
3. **Jangan buat opening untuk tanggal kemarin** - buat untuk hari ini saja
4. **Jangan lupa adjustment** - kalau ada gift/KOL harus diinput
5. **Jangan tutup modal sebelum save** - data akan hilang

---

## 🎯 CHEAT SHEET

| Halaman | Kapan | Action | Required Field |
|---------|-------|--------|----------------|
| **Stock Opening** | Pagi | Input stock awal | Tanggal, Lokasi, Min 1 produk, Quantity > 0 |
| **Stock Adjustments** | Siang (kalau ada) | Input perubahan manual | Tanggal, Type, Reason (min 10), Min 1 produk |
| **Stock Opname** | Malam | Hitung fisik vs system | Tanggal, Lokasi, Physical count, Variance reason (kalau beda) |

---

## 📞 Butuh Bantuan?

Kalau ada error atau bingung:
1. Screenshot error message
2. Cek panduan ini lagi
3. Hubungi admin IT atau supervisor

---

**Versi**: 1.0  
**Terakhir Update**: 9 Juni 2026  
**Dibuat oleh**: Tim IT SparkStage
