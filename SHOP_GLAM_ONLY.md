# Shop Page - Glam Only Configuration

**Date:** 2026-06-18  
**Status:** ✅ Complete

## Changes Made

Shop page telah diubah untuk hanya menampilkan **Glam** section saja. Charm Bar dan Spark Club telah dinonaktifkan sementara.

### 1. Shop Page Navigator (`frontend/src/pages/Shop.tsx`)

**Before:**
- 3 tabs: Glam, Charm Bar, Spark Club
- Spark Club sebagai active tab

**After:**
- 1 tab: Glam (active)
- Charm Bar dan Spark Club di-comment out
- Logo diubah dari "SPARK CLUB" ke "glam-logo.webp"

### 2. Navbar Desktop & Mobile (`frontend/src/components/Navbar.tsx`)

**Before:**
- SHOP menu dengan dropdown: Glam Room, Charm Bar, Spark Club
- Link ke `/shop`

**After:**
- SHOP menu langsung ke `/beauty` (Glam page)
- Dropdown menu di-comment out
- Mobile sidebar: link langsung ke `/beauty`, tidak ada dropdown

### 3. Navigation Items Update

**Before:**
```typescript
{ key: "shop", label: "SHOP", to: "/shop", icon: ShoppingBag }
```

**After:**
```typescript
{ key: "shop", label: "SHOP", to: "/beauty", icon: ShoppingBag }
```

## Files Modified

1. `frontend/src/pages/Shop.tsx`
   - Section navigator: hanya Glam yang tampil
   - Logo header: dari SPARK CLUB → Glam

2. `frontend/src/components/Navbar.tsx`
   - Main nav: SHOP → `/beauty`
   - Mobile sidebar: SHOP → `/beauty`
   - Dropdown disabled (commented out)
   - State `shopDropdownOpen` disabled

## User Experience

### Desktop View
- Click "SHOP" di navbar → langsung ke Glam page (`/beauty`)
- Tidak ada dropdown menu

### Mobile View  
- Click "SHOP" di sidebar → langsung ke Glam page (`/beauty`)
- Tidak ada sub-menu

### Shop Page (`/shop`)
- Hanya menampilkan 1 tab: **Glam** (active)
- Charm Bar dan Spark Club tidak tampil

## Product Filtering

Products yang ditampilkan di Shop page sudah difilter:
```typescript
const nonCharmBarProducts = products.filter((p) => {
  const nameLower = p.name.toLowerCase();
  
  // Filter out Charm Bar products
  if (nameLower.includes("headliner") || 
      nameLower.includes("pop socket") || 
      nameLower.includes("lucky charm") || 
      nameLower.includes("charm") || 
      nameLower.includes("speckles")) {
    return false;
  }
  
  // Filter by category slug
  if (!p.categorySlug) return true;
  const slugLower = p.categorySlug.toLowerCase();
  return !CHARM_BAR_CATEGORY_SLUGS.has(slugLower) && 
         !GLAM_CATEGORY_SLUGS.has(slugLower);
});
```

## Re-enabling Other Sections

Untuk mengaktifkan kembali Charm Bar atau Spark Club, uncomment kode yang di-comment di:

1. `frontend/src/pages/Shop.tsx` - Section navigator tabs
2. `frontend/src/components/Navbar.tsx` - Dropdown menu & state

## Build Status

✅ `npm run build` - Success (1m 15s)

## Related Pages

- `/beauty` - Glam Room (ACTIVE)
- `/charm-bar` - Charm Bar (route masih ada, tapi tidak linked dari Shop)
- `/shop` - Spark Club (route masih ada, tapi tidak linked dari Shop)

## Notes

- Routes untuk Charm Bar dan Spark Club masih aktif, hanya navigation link yang dihidden
- User masih bisa akses langsung via URL jika tahu route-nya
- Untuk benar-benar disable, perlu hapus routes di `App.tsx`
