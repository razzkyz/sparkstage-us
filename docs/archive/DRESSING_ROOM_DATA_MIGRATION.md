# Dressing Room Products Data Migration Guide

## Overview
This migration script separates dressing room products from the regular shop product catalog. This enables:
- **Rental business model**: Daily rental fees + deposit amounts (vs. buy/sell)
- **Separate inventory**: Dressing room items tracked independently
- **RTL invoicing**: Special invoice layout for dressing room rentals
- **Status tracking**: Track item lifecycle (rented → laundry → returned)

## What Gets Migrated

### 1. Products Table
**From**: `products` table (entries with dressing-room category)  
**To**: `dressing_room_products` table

Mapped fields:
- `name` → `name`
- `description` → `description`
- `slug` → `slug`
- `image_url` → `image_url`
- `is_active` → `is_active`
- `created_at`, `updated_at`, `created_by`, `updated_by` → same fields

**Note**: A new `category` field is set to 'clothing' for dressing room products.

### 2. Product Variants
**From**: `product_variants` table  
**To**: `dressing_room_product_variants` table

Mapped fields:
- `name` → `name`
- `sku` → `sku`
- `size` → `size_label`
- `color` → `color`
- `price` → `price`
- `deposit_amount` → `deposit_amount` (if exists, else 0)
- Default `daily_rental_fee` → 15,000 IDR (adjustable)
- Inventory fields initialized to 0 (manually set as needed)

### 3. Rental Order Items
**From**: `rental_order_items` with product_variant_id  
**To**: Updated to reference `dressing_room_product_variant_id`

The migration creates mapping tables to translate old IDs to new ones.

## Migration Steps

### Step 1: Verify Pre-Migration State
Check how many dressing room products exist:
```sql
SELECT COUNT(*) as dressing_room_product_count
FROM public.products p
WHERE p.category_id IN (
  SELECT id FROM public.categories 
  WHERE name ILIKE '%dressing%' OR name ILIKE '%fashion%'
)
AND p.deleted_at IS NULL;
```

### Step 2: Run Migration
```bash
npm run supabase:db:push
```

This will execute both migration files in order:
1. `20260526070000_add_dressing_room_products_system.sql` (creates tables)
2. `20260526080000_migrate_dressing_room_products.sql` (migrates data)

### Step 3: Verify Post-Migration
```sql
-- Check dressing room products created
SELECT COUNT(*) as dr_products FROM public.dressing_room_products;

-- Check variants migrated
SELECT COUNT(*) as dr_variants FROM public.dressing_room_product_variants;

-- Check mapping table
SELECT COUNT(*) as product_mappings FROM public.product_to_dr_product_mapping;
SELECT COUNT(*) as variant_mappings FROM public.product_variant_to_dr_variant_mapping;

-- Check rental order items updated
SELECT COUNT(*) as updated_rentals 
FROM public.rental_order_items 
WHERE dressing_room_product_variant_id IS NOT NULL;
```

## Mapping Tables Reference

### `product_to_dr_product_mapping`
Translates old product IDs to new dressing room product IDs:
- `old_product_id` (INTEGER) → `new_dr_product_id` (BIGINT)
- Keep for reference during transition period
- Can be dropped after verifying all systems work

### `product_variant_to_dr_variant_mapping`
Translates old variant IDs to new dressing room variant IDs:
- `old_variant_id` (INTEGER) → `new_dr_variant_id` (BIGINT)
- Keep for reference during transition period
- Can be dropped after verifying all systems work

## Post-Migration Cleanup

### Option 1: Keep Old Products (Recommended for first run)
Keep `products` table entries with dressing-room category as backup:
- Allows rollback if needed
- Reference for audit trail
- Can soft-delete later (set `deleted_at`)

### Option 2: Archive Old Products
Move dressing room entries to archive:
```sql
UPDATE public.products
SET deleted_at = NOW()
WHERE id IN (
  SELECT old_product_id FROM public.product_to_dr_product_mapping
);
```

### Option 3: Delete Old Products
Complete cleanup (only after confirming migration successful):
```sql
DELETE FROM public.products
WHERE id IN (
  SELECT old_product_id FROM public.product_to_dr_product_mapping
);
```

## Frontend Integration

### 1. Store Page Updates Needed
- Add dressing room products section to product listings
- Use new `dressing_room_products` table for queries

### 2. Rental Order Creation
- When creating rental order, use `dressing_room_product_variant_id`
- Set `invoice_rtl = true` for RTL layout

### 3. Rental Admin Page
- Already created: `/admin/dressing-room-inventory`
- Use new inventory manager component
- Status tracker integration coming

## Troubleshooting

### Migration Fails with FK Constraint Error
**Cause**: rental_order_items has items referencing products that don't have variants

**Solution**: Manually clean up orphaned items:
```sql
DELETE FROM public.rental_order_items
WHERE product_variant_id NOT IN (
  SELECT id FROM public.product_variants
);
```

### Missing Category
**Cause**: Categories table doesn't have dressing-room entry

**Solution**: Create it first:
```sql
INSERT INTO public.categories (name, description)
VALUES ('Dressing Room', 'Dressing room rental products')
ON CONFLICT DO NOTHING;
```

### Inventory Quantities Are Zero
**Cause**: Migration initializes all inventory to 0

**Solution**: Set actual stock levels:
```sql
UPDATE public.dressing_room_product_variants
SET total_quantity = 5,
    available_quantity = 5
WHERE dressing_room_product_id IN (
  SELECT id FROM public.dressing_room_products
  WHERE name ILIKE '%[product name]%'
);
```

## Rollback Plan

If migration fails or needs to be reversed:

### Manual Rollback
1. Delete from `dressing_room_product_variants`
2. Delete from `dressing_room_products`
3. Delete mapping tables
4. Restore `rental_order_items.product_variant_id` values

### Using Supabase Rollback
```bash
npm run supabase:db:reset
```
This resets DB to previous migration state.

## Success Criteria
✅ All dressing room products migrated  
✅ All variants migrated  
✅ Rental order items updated  
✅ Mapping tables created  
✅ Indexes created for performance  
✅ Frontend updated to use new tables  
✅ RTL invoicing working  
✅ Status tracking functional  

## Timeline
- **Immediate**: Run migration on staging
- **Hour 1**: Verify all data
- **Hour 2**: Test rental order creation & status tracking
- **Hour 3**: Deploy to production
- **Day 1**: Monitor for issues
- **Week 1**: Archive old products (if confident)
- **Month 1**: Delete old products (after audit complete)
