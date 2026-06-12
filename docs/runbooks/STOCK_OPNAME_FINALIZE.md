# Stock Opname Finalize Workflow

## Overview

Stock Opname memiliki 2 status:
- **Draft** - Opname baru dibuat, masih bisa dihapus
- **Finalized** - Opname sudah dikunci, stock sudah disesuaikan dengan variance

## Status Draft

Ketika admin membuat stock opname baru, statusnya otomatis **"Draft"** dengan karakteristik:

✅ **Bisa:**
- Melihat detail variance antara physical count vs system stock
- Menghapus opname jika ada kesalahan input
- Finalize untuk mengunci data dan menyesuaikan stock

❌ **Tidak Bisa:**
- Edit opname (opname adalah audit record yang final)

## Cara Finalize Opname

### 1. Di Tabel Opname

- Pada baris opname dengan status **"Draft"**, klik tombol hijau **"Finalize"**
- Muncul dialog konfirmasi:
  ```
  Finalize Stock Opname?
  
  Apakah Anda yakin ingin finalize #opname-00001?
  
  ✅ Stock akan disesuaikan berdasarkan variance
  ⚠️ Setelah di-finalize, opname tidak bisa diedit lagi
  
  Aksi ini akan mengubah stock actual di database.
  ```

### 2. Klik "Ya, Finalize"

Backend akan:
1. ✅ Validasi semua item dengan variance harus punya alasan
2. ✅ Update status opname jadi `finalized`
3. ✅ **Sesuaikan stock di `product_variants`** berdasarkan variance:
   ```
   stock_baru = stock_lama + variance
   ```

### 3. Hasil Finalize

- Status berubah jadi **"✓ Finalized"** (badge hijau)
- Tombol **Finalize** hilang (tidak bisa finalize lagi)
- Stock di database sudah disesuaikan
- Opname jadi audit trail yang terkunci

## Apa yang Terjadi saat Finalize?

### Contoh Scenario

**Stock Opname #opname-00001 pada 8 Juni 2026:**

| Produk | Opening | Sold | Adj | System Stock | Physical Count | **Variance** |
|--------|---------|------|-----|--------------|----------------|--------------|
| T-Shirt Black M | 50 | 5 | -2 | 43 | 40 | **-3** ❌ |
| Tote Bag Pink | 30 | 3 | +1 | 28 | 28 | **0** ✅ |
| Hoodie White L | 20 | 2 | 0 | 18 | 19 | **+1** ✅ |

**Variance Explanation:**
- T-Shirt: Physical count **40**, tapi system stock **43** → ada **-3 hilang** (mungkin rusak/hilang)
- Tote Bag: Physical count **28**, system stock **28** → **Match** ✅
- Hoodie: Physical count **19**, tapi system stock **18** → ada **+1 lebih** (mungkin return customer)

**Saat Finalize:**

```sql
-- T-Shirt Black M
UPDATE product_variants 
SET stock = stock + (-3)  -- 43 - 3 = 40
WHERE id = variant_t_shirt_black_m;

-- Tote Bag Pink (variance = 0, tidak update)
-- No change

-- Hoodie White L  
UPDATE product_variants
SET stock = stock + (+1)  -- 18 + 1 = 19
WHERE id = variant_hoodie_white_l;
```

**Hasil Akhir:**
- ✅ Stock di database sekarang sama dengan physical count
- ✅ Variance sudah di-reconcile
- ✅ Opname jadi audit trail yang terkunci

## Validasi Finalize

Backend akan **REJECT** finalize jika:

❌ Opname tidak punya items
❌ Ada item dengan variance ≠ 0 tapi tidak ada `variance_reason`
❌ Opname sudah finalized sebelumnya

**Contoh Error:**

```
❌ Gagal finalize: Semua item dengan variance harus memiliki alasan
```

**Solusi:** Buka detail opname, tambahkan alasan variance untuk setiap item yang variance-nya ≠ 0.

## Best Practices

### ✅ DO

1. **Review variance** sebelum finalize
   - Cek apakah variance masuk akal
   - Pastikan alasan variance sudah diisi untuk semua item
   
2. **Cross-check physical count**
   - Lakukan recount jika variance terlalu besar
   - Konfirmasi dengan tim gudang
   
3. **Dokumentasi variance**
   - Tulis alasan yang jelas: "Rusak 2 pcs, return customer 1 pcs"
   - Bukan: "salah" atau "tidak tahu"

### ❌ DON'T

1. **Jangan finalize tanpa review**
   - Finalize langsung mengubah stock di database
   - Tidak ada undo setelah finalize
   
2. **Jangan abaikan variance besar**
   - Variance > 10% dari system stock perlu investigasi
   - Mungkin ada kesalahan input opening/adjustment
   
3. **Jangan hapus opname yang sudah finalized**
   - Finalized opname adalah audit record
   - Jika perlu koreksi, buat adjustment baru

## Lifecycle Opname

```
┌─────────────┐
│ Buat Opname │ ← Admin input physical count
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   DRAFT     │ ← Bisa dihapus, bisa finalize
└──────┬──────┘
       │ Klik "Finalize"
       ▼
┌─────────────┐
│ FINALIZED   │ ← Locked, stock sudah disesuaikan
└─────────────┘
```

## Monitoring Finalized Opname

### Di Halaman Stock Opname

**Dashboard Cards:**
- 📋 **Total Opname**: Semua opname (draft + finalized)
- ✅ **Finalized**: Opname yang sudah di-finalize
- 📝 **Draft**: Opname yang masih pending finalize

**Tabel:**
- Kolom **Status**: Badge kuning (Draft) atau hijau (Finalized)
- Kolom **Item Variance**: Badge warning jika ada variance

### Detail Opname

Setelah finalize, detail page akan show:
- ✅ Status: Finalized
- 📊 Summary variance per item
- 📝 Variance reasons
- 🕐 Timestamp finalize

## Troubleshooting

### Problem: Tidak bisa finalize

**Error:** `Semua item dengan variance harus memiliki alasan`

**Solusi:**
1. Buka detail opname
2. Cari item dengan variance ≠ 0
3. Tambahkan `variance_reason` untuk setiap item
4. Coba finalize lagi

### Problem: Variance terlalu besar

**Contoh:** Physical count 10, system stock 50 (variance -40)

**Possible Causes:**
1. ❌ Opening stock salah input (harusnya 10, diinput 50)
2. ❌ Sold quantity belum tercatat (penjualan kasir belum sync)
3. ❌ Adjustment belum diinput (gift/loss belum tercatat)
4. ❌ Physical count salah hitung

**Solusi:**
1. Cross-check opening stock untuk hari itu
2. Cek transaksi penjualan di kasir
3. Cek adjustment yang sudah diinput
4. Recount physical stock

## Related Docs

- [Stock Opname System](./stock-opname-system.md) - Full system architecture
- [Stock Opname Quick Start](./STOCK_OPNAME_QUICKSTART.md) - Tutorial lengkap
- [Admin Product Entry](./admin-product-entry.md) - Data entry rules

## Database Schema

```sql
CREATE TABLE public.stock_opnames (
  id BIGSERIAL PRIMARY KEY,
  opname_number TEXT NOT NULL UNIQUE,
  opname_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT 'SparkStage55',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'finalized')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Status Values:**
- `draft` - Editable, belum finalize
- `finalized` - Locked, stock sudah disesuaikan
