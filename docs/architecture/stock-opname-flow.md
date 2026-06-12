# Stock Opname System Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STOCK OPNAME SYSTEM                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Stock Opening   │  │   Adjustments    │  │  Stock Opname    │
│  (Stock Awal)    │  │  (Manual Change) │  │ (Physical Count) │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         │                     │                     │
         v                     v                     v
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT VARIANTS TABLE                   │
│                     (stock column)                          │
└─────────────────────────────────────────────────────────────┘
```

## Daily Workflow

```
TIME    │ ACTION                      │ TABLE                  │ EFFECT
────────┼─────────────────────────────┼────────────────────────┼──────────────────
09:00   │ Create Stock Opening        │ stock_openings         │ Record opening
        │ Input: 10 pcs               │ stock_opening_items    │ 
        │ Confirm Opening             │                        │ Status: confirmed
        │                             │                        │
────────┼─────────────────────────────┼────────────────────────┼──────────────────
11:00   │ Kasir Scan QR               │ order_products         │ Auto-tracked
        │ Customer Pay                │ order_product_items    │ 
        │ Sold: 3 pcs                 │ payment_status: paid   │ No stock update
        │                             │                        │
14:00   │ Online Order                │ order_products         │ Auto-tracked
        │ Customer Pay                │ order_product_items    │
        │ Sold: 2 pcs                 │ payment_status: paid   │ No stock update
        │                             │                        │
────────┼─────────────────────────────┼────────────────────────┼──────────────────
15:00   │ Create Adjustment           │ stock_adjustments      │ Record adjustment
        │ Type: Gift                  │ stock_adjustment_items │ 
        │ Qty: -3 pcs                 │                        │ ✓ Stock updated!
        │ Reason: "KOL @influencer"   │ product_variants.stock │ -3 immediately
        │                             │                        │
────────┼─────────────────────────────┼────────────────────────┼──────────────────
16:00   │ Kasir Scan QR               │ order_products         │ Auto-tracked
        │ Customer Pay                │ order_product_items    │
        │ Sold: 2 pcs                 │ payment_status: paid   │ No stock update
        │                             │                        │
────────┼─────────────────────────────┼────────────────────────┼──────────────────
20:00   │ Create Stock Opname         │ stock_opnames          │ Calculate variance
        │                             │ stock_opname_items     │
        │ System calculates:          │                        │
        │   Opening:       10 pcs     │ FROM stock_opening     │
        │   Sold:          -7 pcs     │ FROM order_products    │ Calculated!
        │   Adjustments:   -3 pcs     │ FROM adjustments       │
        │   ─────────────────────     │                        │
        │   System Stock:   0 pcs     │                        │
        │                             │                        │
        │ Staff Input:                │                        │
        │   Physical Count: 1 pcs     │                        │
        │   ─────────────────────     │                        │
        │   Variance:      +1 pcs     │                        │
        │   Reason: "Return belum     │                        │
        │            tercatat"        │                        │
```

## Database Relationships

```
┌─────────────────────┐
│  stock_openings     │
│  ─────────────────  │
│  id                 │────┐
│  opening_number     │    │
│  opening_date       │    │
│  location           │    │
│  status             │    │
└─────────────────────┘    │
                           │ 1:N
                           │
                           v
          ┌────────────────────────────┐
          │  stock_opening_items       │
          │  ────────────────────────  │
          │  id                        │
          │  stock_opening_id (FK)     │
          │  product_id (FK)           │
          │  variant_id (FK)           │
          │  opening_quantity          │
          └────────────────────────────┘


┌─────────────────────┐
│  stock_adjustments  │
│  ─────────────────  │
│  id                 │────┐
│  adjustment_number  │    │
│  adjustment_date    │    │
│  adjustment_type    │    │
│  reason             │    │
│  location           │    │
└─────────────────────┘    │
                           │ 1:N
                           │
                           v
          ┌────────────────────────────┐         ┌─────────────────────┐
          │  stock_adjustment_items    │         │  product_variants   │
          │  ────────────────────────  │         │  ─────────────────  │
          │  id                        │         │  id                 │
          │  stock_adjustment_id (FK)  │         │  stock ◄────────────┼─ Updates
          │  product_id (FK)           │         │                     │  on create
          │  variant_id (FK) ──────────┼────────►│  (auto-updated)     │
          │  quantity_change           │         └─────────────────────┘
          └────────────────────────────┘


┌─────────────────────┐
│  stock_opnames      │
│  ─────────────────  │
│  id                 │────┐
│  opname_number      │    │
│  opname_date        │    │
│  location           │    │
│  status             │    │
└─────────────────────┘    │
                           │ 1:N
                           │
                           v
          ┌────────────────────────────┐
          │  stock_opname_items        │
          │  ────────────────────────  │
          │  id                        │
          │  stock_opname_id (FK)      │
          │  product_id (FK)           │
          │  variant_id (FK)           │
          │  opening_stock             │◄── FROM stock_opening
          │  sold_quantity             │◄── FROM order_products (calculated)
          │  adjustment_quantity       │◄── FROM stock_adjustments (calculated)
          │  system_stock              │◄── = opening - sold + adj
          │  physical_count            │◄── User input
          │  variance                  │◄── = physical - system
          │  variance_reason           │
          └────────────────────────────┘
```

## System Stock Calculation Query

```sql
-- This query runs when creating stock opname
-- to calculate system stock automatically

WITH opening_stocks AS (
  -- Get opening stock for the date
  SELECT 
    soi.variant_id,
    soi.product_id,
    soi.opening_quantity
  FROM stock_opening_items soi
  JOIN stock_openings so ON so.id = soi.stock_opening_id
  WHERE so.opening_date = '2026-06-09'
    AND so.location = 'SparkStage55'
    AND so.status = 'confirmed'
),
sales AS (
  -- Calculate total sales for the date
  SELECT 
    opi.product_variant_id AS variant_id,
    SUM(opi.quantity) AS sold_qty
  FROM order_product_items opi
  JOIN order_products op ON op.id = opi.order_product_id
  WHERE DATE(op.created_at) = '2026-06-09'
    AND op.payment_status = 'paid'
    AND op.pickup_status IN ('pending', 'ready', 'completed')
  GROUP BY opi.product_variant_id
),
adjustments AS (
  -- Calculate total adjustments for the date
  SELECT 
    sai.variant_id,
    SUM(sai.quantity_change) AS adj_qty
  FROM stock_adjustment_items sai
  JOIN stock_adjustments sa ON sa.id = sai.stock_adjustment_id
  WHERE sa.adjustment_date = '2026-06-09'
    AND sa.location = 'SparkStage55'
  GROUP BY sai.variant_id
)
SELECT 
  os.variant_id,
  os.opening_quantity AS opening_stock,
  COALESCE(s.sold_qty, 0) AS sold_quantity,
  COALESCE(a.adj_qty, 0) AS adjustment_quantity,
  (os.opening_quantity - COALESCE(s.sold_qty, 0) + COALESCE(a.adj_qty, 0)) AS system_stock
FROM opening_stocks os
LEFT JOIN sales s ON s.variant_id = os.variant_id
LEFT JOIN adjustments a ON a.variant_id = os.variant_id;
```

## Adjustment Type Flow

```
ADJUSTMENT TYPES & STOCK EFFECTS

┌──────────────┬────────────┬──────────────┬─────────────────────────┐
│ Type         │ Qty Change │ Stock Effect │ Use Case                │
├──────────────┼────────────┼──────────────┼─────────────────────────┤
│ gift         │ Negative   │ Decrease     │ Gift to customer/       │
│              │            │              │ partner                 │
├──────────────┼────────────┼──────────────┼─────────────────────────┤
│ kol          │ Negative   │ Decrease     │ KOL marketing/          │
│              │            │              │ influencer giveaway     │
├──────────────┼────────────┼──────────────┼─────────────────────────┤
│ loss         │ Negative   │ Decrease     │ Damaged, stolen,        │
│              │            │              │ missing items           │
├──────────────┼────────────┼──────────────┼─────────────────────────┤
│ gain         │ Positive   │ Increase     │ Returns, found items,   │
│              │            │              │ corrections             │
├──────────────┼────────────┼──────────────┼─────────────────────────┤
│ other        │ Both       │ Both         │ Other manual            │
│              │            │              │ adjustments             │
└──────────────┴────────────┴──────────────┴─────────────────────────┘

Example:
  Create adjustment:
    type: "gift"
    quantity_change: -3
    reason: "Gift untuk KOL @influencer_xyz"
  
  Effect:
    product_variants.stock = stock - 3 (immediately!)
```

## Status Flow

```
STOCK OPENING STATUS
┌───────┐  Confirm   ┌───────────┐
│ draft ├───────────►│ confirmed │ (locked, used in calculations)
└───────┘            └───────────┘

STOCK OPNAME STATUS
┌───────┐  Finalize  ┌───────────┐
│ draft ├───────────►│ finalized │ (locked, variance recorded)
└───────┘            └───────────┘
```

## Data Flow Timeline

```
Day N-1 Closing
       │
       │ (optional: use physical count as next opening)
       │
       v
Day N Opening (09:00)
       │
       ├─► Create stock_opening
       ├─► Input opening quantities
       └─► Confirm opening (locked)
       │
       │
Day N Sales & Operations (10:00-19:00)
       │
       ├─► Kasir/Online Orders ─────► order_products (auto-tracked)
       │                               payment_status: paid
       │
       ├─► Manual Adjustments ──────► stock_adjustments
       │                               ├─► Type: gift/kol/loss/gain
       │                               ├─► Reason: required!
       │                               └─► Update product_variants.stock
       │
       v
Day N Closing (20:00)
       │
       ├─► Create stock_opname
       ├─► Auto-calculate system stock:
       │   ├─ Opening (from stock_opening)
       │   ├─ Sales (from order_products)
       │   └─ Adjustments (from stock_adjustments)
       │
       ├─► Input physical count
       ├─► Calculate variance
       ├─► Input variance reason (if variance != 0)
       └─► Finalize opname
       │
       v
Day N+1 Opening
       │
       └─► Repeat cycle
```

## Key Business Rules

1. **Opening Stock**
   - One opening per date per location
   - Must be confirmed before used in calculations
   - Cannot edit after confirmed

2. **Sales Tracking**
   - Automatic from order_products
   - Only count paid orders
   - Filter: payment_status = 'paid'
   - Filter: pickup_status IN ('pending', 'ready', 'completed')

3. **Adjustments**
   - Reason is mandatory
   - Updates product_variants.stock immediately
   - Cannot be deleted (audit trail)

4. **Stock Opname**
   - System stock auto-calculated
   - Physical count is user input
   - Variance = Physical - System
   - Variance reason required if variance != 0
   - Cannot edit after finalized

5. **Permissions**
   - Admin only (is_admin() check)
   - RLS policies enforce access control
