# Retail Categories Quick Start Guide

**For:** Admin, Super Admin, Owner  
**Updated:** 2026-06-12

## 🚀 Quick Deploy (5 Minutes)

```bash
# 1. Deploy migration
npm run supabase:db:push

# 2. Verify (should return 't' for true)
npm run supabase:db:psql -- -c "SELECT rowsecurity FROM pg_tables WHERE tablename = 'retail_categories';"

# 3. Check sample data (should return 9)
npm run supabase:db:psql -- -c "SELECT COUNT(*) FROM retail_categories;"

# Done! ✅
```

## 📖 What You Get

After deployment, you'll have:
- ✅ `retail_categories` table with RLS enabled
- ✅ 9 sample categories (3 per department)
- ✅ Secure access control (public read, admin write)
- ✅ Ready to use in admin panel

## 🎯 Common Tasks

### View All Categories (Admin)
```typescript
// In admin panel or Supabase Studio
const { data } = await supabase
  .from('retail_categories')
  .select('*')
  .order('department', { ascending: true });
```

### Create New Category
```typescript
const { data, error } = await supabase
  .from('retail_categories')
  .insert({
    department: 'glam',           // glam | charmbar | sparkclub
    name: 'New Category',
    slug: 'glam-new-category',    // Must be unique
    is_active: true
  });
```

### Create Subcategory (Child)
```typescript
// 1. Get parent category ID
const { data: parent } = await supabase
  .from('retail_categories')
  .select('id')
  .eq('slug', 'glam-makeup')
  .single();

// 2. Create child category
const { data } = await supabase
  .from('retail_categories')
  .insert({
    department: 'glam',
    name: 'Face Makeup',
    slug: 'glam-face-makeup',
    parent_id: parent.id,          // Link to parent
    is_active: true
  });
```

### Update Category
```typescript
const { data } = await supabase
  .from('retail_categories')
  .update({ name: 'Updated Name', is_active: false })
  .eq('id', categoryId);
```

### Soft Delete (Recommended)
```typescript
// Disable instead of deleting
const { data } = await supabase
  .from('retail_categories')
  .update({ is_active: false })
  .eq('id', categoryId);
```

### Hard Delete (Permanent)
```typescript
// ⚠️ WARNING: Cannot delete if has children or linked products
const { error } = await supabase
  .from('retail_categories')
  .delete()
  .eq('id', categoryId);

// If error, either:
// 1. Delete children first, OR
// 2. Set parent_id = NULL for children, OR
// 3. Use soft delete instead
```

## 🔐 Access Rules

| Action | Anonymous | User | Admin |
|--------|-----------|------|-------|
| View Active | ✅ | ✅ | ✅ |
| View Inactive | ❌ | ❌ | ✅ |
| Create | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ✅ |

**Admin Roles:** `admin`, `super_admin`, `owner`, `kasir` (read-only)

## 🏗️ Department Structure

```
glam (Beauty & Makeup)
├─ Makeup
├─ Skincare
└─ Haircare

charmbar (Accessories & Jewelry)
├─ Accessories
├─ Jewelry
└─ Bags

sparkclub (Fashion & Apparel)
├─ Apparel
├─ Footwear
└─ Accessories
```

## 💡 Best Practices

### 1. Slug Naming Convention
```
✅ Good:
- glam-face-makeup
- charmbar-necklaces
- sparkclub-t-shirts

❌ Bad:
- Face Makeup (spaces)
- makeup (no department prefix)
- glam_makeup (use dash, not underscore)
```

### 2. Hierarchical Structure
```
Parent Category (level 1)
└─ Subcategory (level 2)
   └─ Sub-subcategory (level 3)
```

**Example:**
```
Makeup (parent_id: NULL)
└─ Face Makeup (parent_id: 1)
   └─ Foundation (parent_id: 2)
```

### 3. Soft Delete vs Hard Delete
```
✅ Soft Delete (Recommended):
- is_active = false
- Preserves data for audit
- Can be reactivated
- Products remain linked

❌ Hard Delete (Risky):
- Permanent deletion
- Products lose category link
- Cannot undo
```

### 4. Category Assignment
```sql
-- Link product to category
UPDATE product_retail
SET retail_category_id = 5  -- Category ID
WHERE id = 123;

-- Link product to subcategory
UPDATE product_retail
SET 
  retail_category_id = 5,      -- Parent category
  retail_subcategory_id = 12   -- Child category
WHERE id = 123;
```

## 🧪 Testing Checklist

After deployment, verify:

**As Anonymous User (Logged Out):**
- [ ] Visit Shop page → See only active categories
- [ ] Try to create category → Should fail (403)

**As Admin:**
- [ ] Login to admin panel
- [ ] View `/admin/retail-products` → See category filter
- [ ] Create new category → Should work
- [ ] Edit category → Should work
- [ ] Toggle is_active → Should work
- [ ] View inactive category → Should see it (public won't)

## 🐛 Common Issues

### Issue 1: Cannot Create Category
**Error:** `new row violates row-level security policy`

**Solution:** Check admin role
```sql
SELECT * FROM user_role_assignments WHERE user_id = 'your-user-id';
```

If not admin, ask super admin to add:
```sql
INSERT INTO user_role_assignments (user_id, role)
VALUES ('your-user-id', 'admin');
```

### Issue 2: Slug Already Exists
**Error:** `duplicate key value violates unique constraint`

**Solution:** Use different slug
```typescript
// Check if slug exists first
const { data: existing } = await supabase
  .from('retail_categories')
  .select('slug')
  .eq('slug', 'glam-makeup')
  .single();

if (existing) {
  // Use different slug: glam-makeup-2, glam-makeup-new, etc.
}
```

### Issue 3: Cannot Delete Category
**Error:** `foreign key constraint violation`

**Cause:** Category has children or linked products

**Solution A - Remove children:**
```sql
-- Set parent_id to NULL (make them root categories)
UPDATE retail_categories 
SET parent_id = NULL 
WHERE parent_id = 123;

-- Now can delete
DELETE FROM retail_categories WHERE id = 123;
```

**Solution B - Soft delete (recommended):**
```sql
-- Just disable instead
UPDATE retail_categories 
SET is_active = false 
WHERE id = 123;
```

## 📊 Useful Queries

### View Category Tree
```sql
SELECT 
  c.id,
  c.name,
  c.slug,
  p.name as parent_name,
  c.is_active
FROM retail_categories c
LEFT JOIN retail_categories p ON c.parent_id = p.id
WHERE c.department = 'glam'
ORDER BY c.parent_id NULLS FIRST, c.name;
```

### Count Products Per Category
```sql
SELECT 
  rc.name as category,
  COUNT(pr.id) as product_count
FROM retail_categories rc
LEFT JOIN product_retail pr ON pr.retail_category_id = rc.id
GROUP BY rc.id, rc.name
ORDER BY product_count DESC;
```

### Find Products Without Category
```sql
SELECT id, name, slug
FROM product_retail
WHERE retail_category_id IS NULL
  AND is_active = true;
```

### Find Orphaned Subcategories
```sql
SELECT id, name, parent_id
FROM retail_categories
WHERE parent_id IS NOT NULL
  AND parent_id NOT IN (SELECT id FROM retail_categories);
```

## 🔗 Quick Links

- **Full Documentation:** `docs/runbooks/retail-categories-rls.md`
- **Deployment Summary:** `RETAIL_CATEGORIES_RLS_SUMMARY.md`
- **Admin Product Page:** `/admin/retail-products`
- **Supabase Studio:** Table Editor → retail_categories

## 🆘 Need Help?

1. Check full documentation: `docs/runbooks/retail-categories-rls.md`
2. Run test queries from deployment summary
3. Check PostgreSQL logs for detailed errors
4. Verify user roles in `user_role_assignments`

---

**Last Updated:** 2026-06-12  
**Next:** Link products to categories in admin panel
