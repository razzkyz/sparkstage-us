# Stock Opname System

## Overview

Sistem Stock Opname yang baru adalah sistem tracking stock harian yang lengkap dengan 3 komponen utama:

1. **Stock Opening** - Input stock awal harian
2. **Stock Adjustments** - Manual adjustments (Gift, KOL, Loss, Gain)
3. **Stock Opname** - Physical count dan variance analysis

## Business Flow

```
┌─────────────────┐
│  Stock Opening  │  Input stock awal setiap hari
│  (#open-00001)  │  Status: draft → confirmed
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         v                  v
┌─────────────────┐  ┌─────────────────┐
│  Auto Tracking  │  │  Adjustments    │
│  Penjualan      │  │  (#adj-00001)   │
│  (Kasir/Web)    │  │  - Gift/KOL     │
│                 │  │  - Loss/Gain    │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    │
                    v
         ┌─────────────────────┐
         │  System Stock       │
         │  = Opening          │
         │    - Sold           │
         │    + Adjustments    │
         └──────────┬──────────┘
                    │
                    v
         ┌─────────────────────┐
         │  Stock Opname       │
         │  (#opname-00001)    │
         │  Physical Count     │
         │  vs System Stock    │
         │  = Variance         │
         └─────────────────────┘
```

## Database Tables

### 1. stock_openings
Header untuk stock awal harian.

**Kolom:**
- `id`: Primary key
- `opening_number`: Auto-generated (#open-00001)
- `opening_date`: Tanggal opening (UNIQUE per location)
- `location`: Lokasi (default: SparkStage55)
- `notes`: Catatan
- `status`: draft | confirmed
- `created_by`: User UUID
- `created_at`, `updated_at`: Timestamps

**Status:**
- `draft`: Masih bisa diedit
- `confirmed`: Locked, digunakan untuk kalkulasi

### 2. stock_opening_items
Detail item stock awal.

**Kolom:**
- `stock_opening_id`: FK ke stock_openings
- `product_id`, `variant_id`: FK ke products/variants
- `opening_quantity`: Jumlah stock awal
- `unit`: Satuan (default: pcs)
- `notes`: Catatan per item

### 3. stock_adjustments
Header untuk adjustment manual.

**Kolom:**
- `id`: Primary key
- `adjustment_number`: Auto-generated (#adj-00001)
- `adjustment_date`: Tanggal adjustment
- `adjustment_type`: gift | kol | loss | gain | other
- `reason`: Alasan (REQUIRED)
- `notes`: Catatan tambahan
- `location`: Lokasi

**Adjustment Types:**
- `gift`: Hadiah untuk customer/partner
- `kol`: KOL marketing/influencer
- `loss`: Kehilangan/rusak
- `gain`: Penambahan (misalnya return)
- `other`: Lainnya

### 4. stock_adjustment_items
Detail item adjustment.

**Kolom:**
- `stock_adjustment_id`: FK ke stock_adjustments
- `product_id`, `variant_id`: FK ke products/variants
- `quantity_change`: Perubahan jumlah (bisa positif/negatif)
- `unit`: Satuan
- `notes`: Catatan per item

**Automatic Effect:**
- Update `product_variants.stock` langsung saat adjustment dibuat

### 5. stock_opnames
Header untuk stock opname (physical count).

**Kolom:**
- `id`: Primary key
- `opname_number`: Auto-generated (#opname-00001)
- `opname_date`: Tanggal opname (UNIQUE per location)
- `location`: Lokasi
- `notes`: Catatan
- `status`: draft | finalized
- `created_by`: User UUID

**Status:**
- `draft`: Masih bisa diedit
- `finalized`: Locked, variance analysis complete

### 6. stock_opname_items
Detail item opname dengan variance.

**Kolom:**
- `stock_opname_id`: FK ke stock_opnames
- `product_id`, `variant_id`: FK ke products/variants
- `opening_stock`: Stock awal dari opening
- `sold_quantity`: Total terjual (auto-calculated)
- `adjustment_quantity`: Total adjustments (auto-calculated)
- `system_stock`: Calculated = opening - sold + adjustments
- `physical_count`: Actual count saat opname
- `variance`: Selisih = physical - system
- `variance_reason`: Alasan jika ada variance
- `unit`: Satuan
- `notes`: Catatan

## RPC Functions

### Stock Opening

#### `create_stock_opening(p_opening_date, p_location, p_notes, p_items)`
Buat stock opening baru.

**Parameters:**
```json
{
  "p_opening_date": "2026-06-09",
  "p_location": "SparkStage55",
  "p_notes": "Stock opening Juni 9",
  "p_items": [
    {
      "product_id": 123,
      "variant_id": 456,
      "opening_quantity": 100,
      "unit": "pcs",
      "notes": "Kondisi baik"
    }
  ]
}
```

**Returns:**
```json
{
  "opening_id": 1,
  "opening_number": "#open-00001",
  "items_processed": 1
}
```

#### `get_stock_opening_list(p_limit, p_offset)`
Get paginated list of stock openings.

#### `get_stock_opening_detail(p_opening_id)`
Get detail stock opening dengan items.

### Stock Adjustment

#### `create_stock_adjustment(p_adjustment_date, p_adjustment_type, p_reason, p_notes, p_location, p_items)`
Buat stock adjustment baru.

**Parameters:**
```json
{
  "p_adjustment_date": "2026-06-09",
  "p_adjustment_type": "gift",
  "p_reason": "Gift untuk KOL @influencer_xyz",
  "p_notes": "Campaign Juni 2026",
  "p_location": "SparkStage55",
  "p_items": [
    {
      "product_id": 123,
      "variant_id": 456,
      "quantity_change": -5,
      "unit": "pcs",
      "notes": "Kaos size M putih"
    }
  ]
}
```

**Effect:**
- Updates `product_variants.stock` immediately
- Negative `quantity_change` = pengurangan stock
- Positive `quantity_change` = penambahan stock

**Returns:**
```json
{
  "adjustment_id": 1,
  "adjustment_number": "#adj-00001",
  "items_processed": 1
}
```

#### `get_stock_adjustment_list(p_limit, p_offset)`
Get paginated list of stock adjustments.

### Stock Opname

#### `calculate_system_stock_for_opname(p_opname_date, p_location)`
Kalkulasi system stock untuk opname date tertentu.

**Returns:** Table dengan kolom:
- `variant_id`, `product_id`
- `product_name`, `variant_name`, `variant_sku`
- `opening_stock`: Dari stock_opening
- `sold_quantity`: Dari order_products (paid orders)
- `adjustment_quantity`: Dari stock_adjustments
- `system_stock`: = opening - sold + adjustments

**Query Sales:**
```sql
SELECT 
  opi.product_variant_id,
  SUM(opi.quantity) AS sold_qty
FROM order_product_items opi
JOIN order_products op ON op.id = opi.order_product_id
WHERE DATE(op.created_at) = p_opname_date
  AND op.payment_status = 'paid'
  AND op.pickup_status IN ('pending', 'ready', 'completed')
GROUP BY opi.product_variant_id
```

#### `create_stock_opname(p_opname_date, p_location, p_notes, p_items)`
Buat stock opname baru.

**Parameters:**
```json
{
  "p_opname_date": "2026-06-09",
  "p_location": "SparkStage55",
  "p_notes": "Stock opname end of day",
  "p_items": [
    {
      "product_id": 123,
      "variant_id": 456,
      "opening_stock": 100,
      "sold_quantity": 8,
      "adjustment_quantity": -5,
      "system_stock": 87,
      "physical_count": 85,
      "variance_reason": "2 pcs rusak tidak tercatat",
      "unit": "pcs",
      "notes": "Perlu update stock"
    }
  ]
}
```

**Variance Calculation:**
- `variance = physical_count - system_stock`
- Positive variance = ada lebih banyak dari sistem (gain)
- Negative variance = ada kurang dari sistem (loss)

**Returns:**
```json
{
  "opname_id": 1,
  "opname_number": "#opname-00001",
  "items_processed": 1
}
```

#### `get_stock_opname_list(p_limit, p_offset)`
Get paginated list of stock opnames.

#### `get_stock_opname_detail(p_opname_id)`
Get detail stock opname dengan items dan variance.

## Daily Workflow

### Morning: Stock Opening
1. Admin buka halaman Stock Opening
2. Klik "Buat Stock Opening" untuk hari ini
3. Input stock awal untuk setiap produk variant
4. Save as draft (bisa edit lagi)
5. Confirm opening (locked)

### During Day: Sales & Adjustments

**Sales (Automatic):**
- Kasir scan QR dan process order → `order_products` created
- Payment confirmed → `payment_status = 'paid'`
- System auto-track sold quantity

**Manual Adjustments:**
- Ada gift untuk influencer → Buat adjustment type "gift" dengan quantity -X
- Ada barang rusak → Buat adjustment type "loss" dengan quantity -X
- Ada return → Buat adjustment type "gain" dengan quantity +X

### Evening: Stock Opname
1. Admin buka halaman Stock Opname
2. Klik "Buat Stock Opname" untuk hari ini
3. System auto-load system stock calculation:
   - Opening stock (dari stock_opening)
   - Sold quantity (dari order_products)
   - Adjustments (dari stock_adjustments)
   - System stock = opening - sold + adjustments
4. Staff input physical count (actual count)
5. System calculate variance = physical - system
6. Jika ada variance, input variance reason
7. Save opname

## Example Scenario

**Tanggal: 2026-06-09**
**Produk: Kaos Brand X, Variant: Size M - Putih**

### Morning (9:00 AM): Stock Opening
```
Stock Awal: 10 pcs
```

### During Day:
- **11:00 AM**: Terjual 3 pcs (kasir)
- **14:00 PM**: Terjual 2 pcs (online)
- **15:00 PM**: Gift untuk KOL -3 pcs (adjustment)
- **16:00 PM**: Terjual 2 pcs (kasir)

### Evening (20:00 PM): Stock Opname
```
Stock Awal:           10 pcs
Terjual (Total):      -7 pcs  (3+2+2 dari kasir/online)
Adjustment (Gift):    -3 pcs
─────────────────────────────
System Stock:          0 pcs  (10 - 7 - 3)

Physical Count:        1 pcs  (staff count actual)
─────────────────────────────
Variance:             +1 pcs  (1 - 0)
Variance Reason:      "1 pcs return dari customer tidak tercatat"
```

**Action:** Buat adjustment "gain" +1 untuk reconcile variance.

## Frontend Pages

### 1. Stock Opening (`/admin/stock-opening`)
- List semua stock openings
- Filter by date, status
- Create new opening
- Edit/delete draft openings
- Confirm opening

### 2. Stock Adjustments (`/admin/stock-adjustments`)
- List semua stock adjustments
- Filter by date, type
- Create new adjustment
- View adjustment detail
- Types: Gift, KOL, Loss, Gain, Other

### 3. Stock Opname (`/admin/stock-opname`)
- List semua stock opnames
- Filter by date, status
- Create new opname with auto-calculated system stock
- Input physical count
- View variance report
- Finalize opname

## Reports & Analytics

### Stock Movement Report
Track stock movement per product/variant:
- Opening stock
- Sales volume
- Adjustment volume
- Closing stock (from opname)
- Variance trend

### Variance Analysis
Identify products dengan frequent variance:
- Recurring loss items
- High-risk SKUs
- Need tighter control

## Migration Notes

**Old System:**
- Simple stock in/out/adjustment transactions
- No daily opening tracking
- No auto sales tracking
- No variance analysis

**New System:**
- Complete daily stock lifecycle
- Auto-tracking penjualan dari orders
- Manual adjustment dengan clear categorization
- Physical count vs system stock comparison
- Variance analysis dan reconciliation

**Migration Steps:**
1. Deploy new migrations
2. Train staff on new workflow
3. Start with next opening day (no backfill)
4. Old stock_opname data remains in DB (read-only)

## Permissions

**Required Role:** `admin`, `kasir`, or `owner`
- All RPC functions check `public.is_admin()`
- RLS policies enforce admin-only access

## Best Practices

1. **Daily Opening**: Always confirm opening before sales start
2. **Real-time Adjustments**: Record adjustments immediately when they happen
3. **Clear Reasons**: Always provide clear reason for adjustments
4. **Physical Count**: Count accurately during opname
5. **Variance Investigation**: Investigate all variances > 5% or > 5 units
6. **Reconciliation**: Create adjustment to reconcile variance after investigation

## Troubleshooting

### Q: Stock Opening sudah ada untuk tanggal ini
**A:** Hanya bisa 1 opening per date per location. Edit yang existing atau pilih tanggal lain.

### Q: Adjustment membuat stock negatif
**A:** System akan reject adjustment yang membuat stock < 0. Check stock aktual terlebih dahulu.

### Q: Sales tidak tercatat di opname
**A:** Pastikan:
- Order status = 'paid'
- Order pickup_status IN ('pending', 'ready', 'completed')
- Order created_at date match dengan opname_date

### Q: System stock tidak match dengan database
**A:** Run manual query untuk verify:
```sql
SELECT * FROM calculate_system_stock_for_opname('2026-06-09', 'SparkStage55');
```

## Future Enhancements

- [ ] Auto-create opening from previous day's opname physical count
- [ ] Notification for high variance items
- [ ] Bulk import opening from Excel
- [ ] Mobile app for physical counting
- [ ] Barcode scanning for faster counting
- [ ] Variance trend analysis dashboard
- [ ] Integration with CCTV for loss prevention
- [ ] Auto-adjustment for approved variances
