# Stock Opname System - Implementation Summary

## ✅ Apa Yang Sudah Dibuat

### 1. Database Migrations (2 files)

#### Migration 1: `20260609010000_revamp_stock_opname_system.sql`
**Tables Created:**
- `stock_openings` - Stock awal harian
- `stock_opening_items` - Detail stock awal per product variant
- `stock_adjustments` - Manual adjustments (gift, KOL, loss, gain)
- `stock_adjustment_items` - Detail adjustments
- `stock_opnames` - Stock opname dengan variance
- `stock_opname_items` - Detail opname dengan system stock vs physical count

**Features:**
- Auto-numbering (#open-00001, #adj-00001, #opname-00001)
- Updated_at triggers
- RLS policies (admin-only)
- Unique constraints (1 opening/opname per date per location)

#### Migration 2: `20260609020000_stock_opname_rpc_functions.sql`
**RPC Functions:**
- `create_stock_opening()` - Buat stock opening
- `get_stock_opening_list()` - List stock openings
- `get_stock_opening_detail()` - Detail stock opening
- `create_stock_adjustment()` - Buat adjustment (auto-update stock)
- `get_stock_adjustment_list()` - List adjustments
- `calculate_system_stock_for_opname()` - Kalkulasi system stock otomatis
- `create_stock_opname()` - Buat stock opname
- `get_stock_opname_list()` - List stock opnames
- `get_stock_opname_detail()` - Detail stock opname

### 2. Frontend Hooks

**File:** `frontend/src/hooks/useStockOpnameNew.ts`

**Hooks Created:**
```typescript
// Stock Opening
useStockOpeningList()
useStockOpeningDetail(openingId)
useCreateStockOpening()

// Stock Adjustment
useStockAdjustmentList()
useCreateStockAdjustment()

// Stock Opname
useStockOpnameList()
useStockOpnameDetail(opnameId)
useCalculateSystemStock(opnameDate, location)
useCreateStockOpname()
```

### 3. Documentation

1. **Runbook:** `docs/runbooks/stock-opname-system.md`
   - Complete system overview
   - Business flow diagram
   - Database schema documentation
   - RPC function reference
   - Daily workflow guide
   - Example scenarios
   - Troubleshooting guide

2. **Decision Doc:** `docs/decisions/stock-opname-revamp-2026-06-09.md`
   - Problem statement
   - Solution architecture
   - Migration strategy
   - Example scenarios
   - Risk zones
   - Status checklist

3. **Updated:** `AGENTS.md`
   - Added references to new stock opname docs

## 🎯 Sistem Yang Dibangun

### Flow Harian

```
PAGI (9:00 AM)
┌─────────────────────────────┐
│   STOCK OPENING             │
│   Input stock awal: 10 pcs  │
└─────────────┬───────────────┘
              │
              v
SIANG (11:00-16:00)
┌─────────────────────────────┐
│   AUTO-TRACKING PENJUALAN   │
│   - Kasir: -3, -2 pcs       │
│   - Online: -2 pcs          │
│   Total: -7 pcs             │
└─────────────┬───────────────┘
              │
              v
┌─────────────────────────────┐
│   MANUAL ADJUSTMENTS        │
│   - Gift KOL: -3 pcs        │
│   Reason: "KOL @influencer" │
└─────────────┬───────────────┘
              │
              v
MALAM (20:00 PM)
┌─────────────────────────────┐
│   STOCK OPNAME              │
│                             │
│   System Stock Calculation: │
│   Opening:     10 pcs       │
│   Sold:        -7 pcs       │
│   Adjustments: -3 pcs       │
│   ────────────────────      │
│   System Stock: 0 pcs       │
│                             │
│   Physical Count: 1 pcs     │
│   ────────────────────      │
│   Variance: +1 pcs          │
│   Reason: "Return belum     │
│            tercatat"        │
└─────────────────────────────┘
```

### Key Features

1. **Stock Awal Tracking**
   - Input stock opening setiap hari
   - Status draft → confirmed
   - Unique per date per location

2. **Auto Sales Tracking**
   - Otomatis track penjualan dari `order_products`
   - Filter: payment_status = 'paid'
   - Filter: pickup_status IN ('pending', 'ready', 'completed')
   - Group by date dan variant

3. **Manual Adjustments**
   - Types: gift, kol, loss, gain, other
   - **Wajib ada reason**
   - **Auto-update product_variants.stock**
   - Positive quantity = gain
   - Negative quantity = loss

4. **Variance Analysis**
   - System Stock = Opening - Sold + Adjustments
   - Physical Count = actual count saat opname
   - Variance = Physical - System
   - Track variance reason jika ada selisih

## 📋 Yang Perlu Dilakukan Next

### Frontend Implementation (Belum Dibuat)

#### 1. Stock Opening Page (`/admin/stock-opening`)
**Komponen yang perlu dibuat:**
- `frontend/src/pages/admin/StockOpening.tsx` (main page)
- `frontend/src/pages/admin/stock-opening/StockOpeningList.tsx`
- `frontend/src/pages/admin/stock-opening/StockOpeningForm.tsx`
- `frontend/src/pages/admin/stock-opening/StockOpeningDetail.tsx`

**Features:**
- List stock openings dengan filter date & status
- Form create new opening
- Select products/variants
- Input opening quantities
- Confirm opening (lock)

#### 2. Stock Adjustments Page (`/admin/stock-adjustments`)
**Komponen yang perlu dibuat:**
- `frontend/src/pages/admin/StockAdjustments.tsx` (main page)
- `frontend/src/pages/admin/stock-adjustments/StockAdjustmentList.tsx`
- `frontend/src/pages/admin/stock-adjustments/StockAdjustmentForm.tsx`
- `frontend/src/pages/admin/stock-adjustments/StockAdjustmentDetail.tsx`

**Features:**
- List adjustments dengan filter date & type
- Form create adjustment
- Type selector (gift, kol, loss, gain, other)
- **Mandatory reason field**
- Select products/variants
- Input quantity change (positive/negative)

#### 3. Stock Opname Page (Revamp) (`/admin/stock-opname`)
**Update existing page:**
- `frontend/src/pages/admin/StockOpname.tsx` (REVAMP)
- `frontend/src/pages/admin/stock-opname/StockOpnameForm.tsx` (NEW)
- `frontend/src/pages/admin/stock-opname/StockOpnameDetail.tsx` (UPDATE)

**Features:**
- List opnames dengan variance count
- **Auto-load system stock calculation**
- Show: Opening, Sold, Adjustments, System Stock
- Input physical count
- Auto-calculate variance
- Input variance reason if variance != 0
- Finalize opname

### Testing Checklist

- [ ] Deploy migrations to dev database
- [ ] Test stock opening creation
- [ ] Test stock adjustment with different types
- [ ] Verify product_variants.stock updates after adjustment
- [ ] Test sales auto-tracking from order_products
- [ ] Test system stock calculation
- [ ] Test stock opname with variance
- [ ] Test variance = 0 scenario
- [ ] Test RLS policies (admin-only access)

### Go-Live Checklist

- [ ] Deploy migrations to production
- [ ] Frontend pages implemented and tested
- [ ] Staff training completed
- [ ] SOPs documented
- [ ] Practice run completed
- [ ] Go-live on next opening day

## 💡 Cara Menggunakan

### 1. Deploy Migrations

```bash
# Push migrations to database
npm run supabase:db:push

# Or via Supabase CLI
supabase db push
```

### 2. Test RPC Functions

```sql
-- Test create stock opening
SELECT create_stock_opening(
  '2026-06-09'::date,
  'SparkStage55',
  'Stock opening test',
  '[
    {
      "product_id": 123,
      "variant_id": 456,
      "opening_quantity": 10,
      "unit": "pcs"
    }
  ]'::jsonb
);

-- Test get stock opening list
SELECT * FROM get_stock_opening_list(50, 0);

-- Test create adjustment
SELECT create_stock_adjustment(
  '2026-06-09'::date,
  'gift',
  'Gift untuk KOL @influencer',
  'Campaign test',
  'SparkStage55',
  '[
    {
      "product_id": 123,
      "variant_id": 456,
      "quantity_change": -3,
      "unit": "pcs"
    }
  ]'::jsonb
);

-- Test calculate system stock
SELECT * FROM calculate_system_stock_for_opname('2026-06-09', 'SparkStage55');

-- Test create opname
SELECT create_stock_opname(
  '2026-06-09'::date,
  'SparkStage55',
  'Stock opname end of day',
  '[
    {
      "product_id": 123,
      "variant_id": 456,
      "opening_stock": 10,
      "sold_quantity": 7,
      "adjustment_quantity": -3,
      "system_stock": 0,
      "physical_count": 1,
      "variance_reason": "1 pcs return tidak tercatat",
      "unit": "pcs"
    }
  ]'::jsonb
);
```

### 3. Frontend Implementation Example

```typescript
// Example: Create stock opening
import { useCreateStockOpening } from '../hooks/useStockOpnameNew';

function StockOpeningForm() {
  const createOpening = useCreateStockOpening();

  const handleSubmit = async () => {
    try {
      const result = await createOpening.mutateAsync({
        opening_date: '2026-06-09',
        location: 'SparkStage55',
        notes: 'Stock opening',
        items: [
          {
            product_id: 123,
            variant_id: 456,
            opening_quantity: 10,
            unit: 'pcs',
          },
        ],
      });

      console.log('Created:', result.opening_number);
    } catch (error) {
      console.error('Error:', error);
    }
  };
}
```

## 🔧 Troubleshooting

### Error: "Stock opening already exists for date"
**Solution:** Hanya bisa 1 opening per date per location. Edit yang existing atau pilih tanggal lain.

### Error: "Adjustment would make stock negative"
**Solution:** Quantity change membuat stock < 0. Check stock actual terlebih dahulu.

### Sales tidak tercatat di opname
**Check:**
1. Order payment_status = 'paid'?
2. Order pickup_status IN ('pending', 'ready', 'completed')?
3. Order created_at date match dengan opname_date?

## 📞 Support

Jika ada pertanyaan atau butuh bantuan implementation:
1. Baca full documentation: `docs/runbooks/stock-opname-system.md`
2. Check decision doc: `docs/decisions/stock-opname-revamp-2026-06-09.md`
3. Review frontend hooks: `frontend/src/hooks/useStockOpnameNew.ts`

## 🎉 Summary

**Sudah dibuat:**
- ✅ Complete database schema (6 tables)
- ✅ 9 RPC functions untuk semua operations
- ✅ Frontend TypeScript hooks
- ✅ Complete documentation
- ✅ Migration files ready to deploy

**Belum dibuat (next step):**
- ⏳ Frontend pages (Stock Opening, Adjustments, Opname revamp)
- ⏳ Testing & validation
- ⏳ Staff training & SOPs
- ⏳ Go-live

Sistem sudah siap dari sisi backend! Tinggal implement frontend pages dan testing. 🚀
