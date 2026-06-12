# Stock Opname System

## Overview

Stock Opname adalah sistem untuk tracking perubahan stock produk di Spark Stage. System ini mencatat stock in, stock out, dan adjustment dengan detail lengkap dan history tracking.

## Features

- ✅ Create stock opname dengan multiple items
- ✅ Auto-generate opname number (#sop-00001, #sop-00002, dst)
- ✅ Support 3 jenis transaksi:
  - **Stock In**: Barang masuk (qty bertambah)
  - **Stock Out**: Barang keluar (qty berkurang)
  - **Adjustment**: Penyesuaian stock
- ✅ Track before/after stock quantity
- ✅ Optional cost per unit tracking
- ✅ Multiple unit types (pcs, gr, kg, box, pack)
- ✅ Location tracking (default: SparkStage55)
- ✅ User tracking (created_by)
- ✅ Detailed history log

## Database Schema

### Table: `stock_opname`

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| opname_number | TEXT | Auto-generated unique ID (#sop-xxxxx) |
| location | TEXT | Lokasi (default: SparkStage55) |
| transaction_date | TIMESTAMPTZ | Tanggal transaksi |
| transaction_type | TEXT | Jenis: stock_in, stock_out, adjustment |
| reason | TEXT | Alasan perubahan stock |
| notes | TEXT | Catatan tambahan |
| created_by | UUID | User yang membuat |
| created_at | TIMESTAMPTZ | Waktu dibuat |
| updated_at | TIMESTAMPTZ | Waktu diupdate |

### Table: `stock_opname_items`

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| stock_opname_id | BIGINT | FK to stock_opname |
| product_id | BIGINT | FK to products |
| variant_id | BIGINT | FK to product_variants |
| quantity_before | INTEGER | Stock sebelum perubahan |
| quantity_change | INTEGER | Perubahan stock (+/-) |
| quantity_after | INTEGER | Stock setelah perubahan |
| unit | TEXT | Satuan (pcs, gr, kg, etc) |
| cost_per_unit | NUMERIC | Biaya per unit (optional) |
| created_at | TIMESTAMPTZ | Waktu dibuat |

## RPC Functions

### `create_stock_opname`

Create stock opname dengan items dan auto-update stock product_variants.

**Parameters:**
- `p_location` (TEXT): Lokasi
- `p_transaction_date` (TIMESTAMPTZ): Tanggal transaksi
- `p_transaction_type` (TEXT): Jenis transaksi
- `p_reason` (TEXT): Alasan
- `p_notes` (TEXT): Catatan
- `p_items` (JSONB): Array of items

**Item Format:**
```json
{
  "variant_id": 123,
  "quantity_change": 10,
  "unit": "pcs",
  "cost_per_unit": 50000
}
```

**Returns:**
```json
{
  "opname_id": 1,
  "opname_number": "#sop-00001",
  "items_processed": 3
}
```

### `get_stock_opname_list`

Get paginated list of stock opname records.

**Parameters:**
- `p_limit` (INTEGER): Jumlah data per page (default: 50)
- `p_offset` (INTEGER): Offset untuk pagination (default: 0)

**Returns:**
```json
{
  "data": [...],
  "total_count": 100,
  "limit": 50,
  "offset": 0
}
```

### `get_stock_opname_detail`

Get detailed stock opname with all items.

**Parameters:**
- `p_opname_id` (BIGINT): Stock opname ID

**Returns:** Full stock opname detail with items array

## Frontend Usage

### Routes

- `/admin/stock-opname` - List page
- `/admin/stock-opname/:id` - Detail page

### React Hooks

```typescript
import {
  useStockOpnameList,
  useStockOpnameDetail,
  useCreateStockOpname,
} from '../hooks/useStockOpname';

// Get list
const { data, isLoading } = useStockOpnameList(50, 0);

// Get detail
const { data: detail } = useStockOpnameDetail(opnameId);

// Create new
const createMutation = useCreateStockOpname();
await createMutation.mutateAsync(formData);
```

## Access Control

- **Admin**: Full access (create, view)
- **Kasir**: Full access (create, view)
- **Others**: No access

RLS policies enforce admin/kasir-only access.

## Example Workflow

### Stock In (Barang Masuk dari Supplier)

1. Admin membuka `/admin/stock-opname`
2. Klik "Buat Stock Opname"
3. Pilih jenis "Stok Masuk"
4. Isi alasan: "Pembelian dari supplier XYZ"
5. Search dan pilih produk
6. Input quantity (positive number)
7. (Optional) Input cost per unit
8. Klik "Tambah Produk"
9. Ulangi untuk produk lain
10. Klik "Simpan"

Result: Stock product bertambah dan tercatat di history.

### Stock Out (Barang Rusak/Hilang)

1. Same flow tapi pilih "Stok Keluar"
2. Alasan: "Barang rusak"
3. Quantity akan otomatis jadi negative

Result: Stock berkurang.

### Adjustment (Koreksi Stock)

1. Same flow, pilih "Adjustment"
2. Bisa untuk koreksi +/- stock
3. Alasan: "Stock opname fisik - koreksi selisih"

## Notes

- Stock tidak bisa negative - akan error jika mencoba
- Auto-generate opname_number dengan format `#sop-xxxxx`
- Update stock product_variants dilakukan atomic
- Transaction-safe: jika salah satu item error, semua rollback
- Created_by otomatis dari auth.uid()

## Migration File

Migration: `20260608000000_add_stock_opname_system.sql`

To apply:
```bash
npm run supabase:db:push
```

## Future Enhancements

- [ ] Export stock opname report to Excel
- [ ] Stock opname approval workflow
- [ ] Barcode/QR scanner integration
- [ ] Stock opname template
- [ ] Recurring stock opname scheduling
- [ ] Stock valuation report
- [ ] Integration with accounting system
