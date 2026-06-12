# Stock Opname System Revamp

**Date:** 2026-06-09  
**Status:** Implemented  
**Type:** Database + Backend + Frontend

## Problem

The old stock opname system was too simple:
- No daily stock opening tracking
- No automatic sales tracking from kasir/website
- No variance analysis between system and physical count
- No clear categorization for adjustments (gift, KOL, loss, etc.)

Business needed a proper daily stock management flow:
1. Stock Awal (opening stock)
2. Auto-track penjualan (kasir + website)
3. Manual adjustments (gift, KOL, loss) with reasons
4. Physical count vs system stock comparison
5. Variance analysis

## Solution

Complete system revamp with 3 main components:

### 1. Stock Opening (Stock Awal Harian)
- Input stock awal setiap hari
- Status: draft → confirmed
- Locked once confirmed
- One opening per date per location

**Tables:**
- `stock_openings` (header)
- `stock_opening_items` (detail)

### 2. Stock Adjustments (Manual Changes)
- Gift untuk customers/partners
- KOL marketing giveaways
- Loss (kehilangan, rusak)
- Gain (return, penambahan)
- Other (lainnya)
- **Requires reason** (mandatory)
- **Auto-updates product_variants.stock**

**Tables:**
- `stock_adjustments` (header)
- `stock_adjustment_items` (detail)

### 3. Stock Opname (Physical Count)
- Auto-calculate system stock:
  - Opening stock (dari stock_opening)
  - Sold quantity (dari order_products dengan status paid)
  - Adjustments (dari stock_adjustments)
  - **System Stock = Opening - Sold + Adjustments**
- Input physical count
- Calculate variance = Physical - System
- Require variance reason if variance != 0
- Status: draft → finalized

**Tables:**
- `stock_opnames` (header)
- `stock_opname_items` (detail dengan variance)

## Database Changes

### Migrations Created:
1. `20260609010000_revamp_stock_opname_system.sql`
   - Drop old stock_opname tables
   - Create new table structure
   - Auto-numbering functions (#open-00001, #adj-00001, #opname-00001)
   - Triggers for auto-numbering
   - RLS policies

2. `20260609020000_stock_opname_rpc_functions.sql`
   - `create_stock_opening()`
   - `get_stock_opening_list()`, `get_stock_opening_detail()`
   - `create_stock_adjustment()`
   - `get_stock_adjustment_list()`
   - `calculate_system_stock_for_opname()` - auto-calculate system stock
   - `create_stock_opname()`
   - `get_stock_opname_list()`, `get_stock_opname_detail()`

### Key Queries

**Auto-track Sales:**
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

## Frontend Changes

### New Hooks Created:
File: `frontend/src/hooks/useStockOpnameNew.ts`

**Stock Opening:**
- `useStockOpeningList()`
- `useStockOpeningDetail()`
- `useCreateStockOpening()`

**Stock Adjustment:**
- `useStockAdjustmentList()`
- `useCreateStockAdjustment()`

**Stock Opname:**
- `useStockOpnameList()`
- `useStockOpnameDetail()`
- `useCalculateSystemStock()` - get pre-calculated system stock
- `useCreateStockOpname()`

### Pages to Update:
1. `/admin/stock-opening` (NEW)
   - List stock openings
   - Create/edit opening
   - Confirm opening

2. `/admin/stock-adjustments` (NEW)
   - List adjustments
   - Create adjustment with type selection
   - Mandatory reason field

3. `/admin/stock-opname` (REVAMP)
   - List opnames
   - Create opname with auto-loaded system stock
   - Input physical count
   - View variance report
   - Finalize opname

## Daily Workflow

### Morning (Opening)
1. Admin creates stock opening for today
2. Input opening quantity for each product variant
3. Confirm opening (locked)

### During Day
**Automatic:**
- Kasir processes sales → order_products created
- Payment confirmed → auto-tracked in sales

**Manual:**
- Gift to influencer → Create adjustment type "gift" with reason
- Item damaged → Create adjustment type "loss" with reason
- Item returned → Create adjustment type "gain" with reason

### Evening (Opname)
1. Admin creates stock opname for today
2. System auto-calculates system stock:
   - Opening: 10 pcs
   - Sold: -7 pcs
   - Adjustments: -2 pcs (gift)
   - **System Stock: 1 pcs**
3. Staff counts physical stock: 0 pcs
4. Variance: -1 pcs (1 pcs loss tidak tercatat)
5. Input variance reason: "1 pcs rusak tidak tercatat"
6. Save opname

## Example Scenario

**Product:** Kaos Brand X, Size M - Putih  
**Date:** 2026-06-09

```
Stock Opening:          10 pcs
─────────────────────────────
Sales:
  - Kasir (11:00)       -3 pcs
  - Online (14:00)      -2 pcs
  - Kasir (16:00)       -2 pcs
Total Sold:             -7 pcs

Adjustments:
  - Gift KOL (15:00)    -3 pcs
Total Adjustments:      -3 pcs
─────────────────────────────
System Stock:            0 pcs  (10 - 7 - 3)

Physical Count:          1 pcs
Variance:               +1 pcs  (1 - 0)
Variance Reason:        "1 pcs return tidak tercatat"
```

**Next Action:** Create adjustment type "gain" +1 to reconcile.

## Migration Strategy

**No Data Migration:**
- Old `stock_opname` tables dropped
- Old data lost (acceptable - was incomplete system)
- Start fresh from next opening day

**Training Required:**
- Staff training on new 3-step workflow
- Emphasis on recording adjustments in real-time
- Proper physical counting procedures

## Benefits

1. **Complete Audit Trail**
   - Track stock awal harian
   - Auto-track penjualan
   - Clear categorization untuk adjustments
   - Variance analysis

2. **Better Accuracy**
   - System stock vs physical count
   - Identify recurring loss items
   - Investigate variances

3. **Clear Accountability**
   - Who created opening
   - Who made adjustments (with reasons)
   - Who did physical count

4. **Business Intelligence**
   - Sales volume per day
   - Adjustment trends (gift, loss patterns)
   - Variance trends
   - High-risk SKUs

## Risk Zones

1. **Daily Opening Discipline**
   - MUST confirm opening before sales start
   - If missed, system stock calculation wrong

2. **Real-time Adjustments**
   - Adjustments MUST be recorded immediately
   - If delayed, system stock inaccurate

3. **Physical Count Accuracy**
   - Requires careful counting
   - Double-check high-value items

## Rollback Plan

If issues occur:
1. Keep old migration files (read-only)
2. Can revert to simple stock in/out
3. New system tables can be dropped cleanly

## Documentation

- Full runbook: `docs/runbooks/stock-opname-system.md`
- Frontend hooks: `frontend/src/hooks/useStockOpnameNew.ts`
- Migration files: `supabase/migrations/20260609*.sql`

## Status

- [x] Database migrations created
- [x] RPC functions implemented
- [x] TypeScript hooks created
- [x] Documentation written
- [ ] Frontend pages implementation
- [ ] Staff training
- [ ] Go-live

## Next Steps

1. Implement frontend pages:
   - Stock Opening page
   - Stock Adjustments page
   - Revamp Stock Opname page

2. Testing:
   - Test full daily workflow
   - Verify sales auto-tracking
   - Verify adjustment stock updates
   - Verify variance calculations

3. Training:
   - Train admin staff on new workflow
   - Document SOPs
   - Practice runs before go-live

4. Go-live:
   - Deploy migrations
   - Start with next opening day
   - Monitor first week closely
