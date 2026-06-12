# Dressing Room Products System

## Overview

Sistem dressing room products adalah katalog dan inventory terpisah dari regular products. Ini memungkinkan:

- **Inventory terpisah**: Dressing room memiliki stock management sendiri
- **Rental tracking**: Setiap item rental bisa di-track statusnya (sedang disewa, di laundry, rusak, dll)
- **RTL invoice**: Invoice untuk dressing room ditampilkan RTL (Arabic/Persian layout)
- **Admin control**: Admin dan dressing room admin bisa manage inventory dari dashboard

## Database Tables

### `dressing_room_products`
Tabel katalog produk dressing room (baju, aksesori, dll).

```sql
- id: BIGINT (PK)
- name: TEXT (nama produk)
- description: TEXT
- category: TEXT (clothing, accessories, etc)
- slug: TEXT (unique)
- image_url: TEXT
- is_active: BOOLEAN
- is_deleted: BOOLEAN (soft delete)
- created_at, updated_at
- created_by, updated_by (user_id)
```

### `dressing_room_product_variants`
Varian produk dengan detail inventory dan pricing.

```sql
- id: BIGINT (PK)
- dressing_room_product_id: FK to dressing_room_products
- name: TEXT (ukuran, warna, etc)
- sku: TEXT (unique)
- size_label, color: TEXT
- price: INTEGER (harga sewa)
- deposit_amount: INTEGER (deposit)
- daily_rental_fee: INTEGER
- Inventory:
  - total_quantity
  - available_quantity (bisa di-sewa)
  - reserved_quantity (sudah di-pesan)
  - damaged_quantity (rusak)
  - in_laundry_quantity (di-laundry)
```

### `rental_item_status_history`
Tracking history setiap item rental (untuk audit trail).

```sql
- id: BIGINT (PK)
- rental_order_id, rental_order_item_id: FK
- status: ENUM (rented, in_laundry, damaged, returned_pending, returned, lost, hold)
- previous_status, reason, notes
- photo_urls: TEXT[] (untuk proof/dokumentasi)
- created_at, created_by
```

## Status Rental Item

Setiap item dalam rental order bisa memiliki status:

| Status | Deskripsi |
|--------|-----------|
| `rented` | Sedang disewa oleh customer |
| `in_laundry` | Dalam proses laundry/pembersihan |
| `damaged` | Item rusak/cacat |
| `returned_pending` | Sudah dikembalikan, pending verifikasi |
| `returned` | Sudah dikembalikan & verified |
| `lost` | Item hilang |
| `hold` | Ditahan pending charge/investigasi |

## RPC Functions

### `update_rental_item_status()`
Update status item rental dan catat ke history.

```sql
SELECT update_rental_item_status(
  p_rental_order_item_id => 123,
  p_new_status => 'in_laundry',
  p_reason => 'Cleaning required',
  p_notes => 'Light stain on sleeve',
  p_photo_urls => ARRAY['https://...', 'https://...']
)
```

**Response:**
```json
{
  "success": true,
  "item_id": 123,
  "previous_status": "rented",
  "new_status": "in_laundry",
  "updated_at": "2026-05-26T10:00:00Z"
}
```

### `update_dressing_room_variant_inventory()`
Update inventory varian (stok).

```sql
SELECT update_dressing_room_variant_inventory(
  p_variant_id => 45,
  p_total_qty => 10,
  p_available_qty => 7,
  p_damaged_qty => 1,
  p_in_laundry_qty => 2
)
```

### `get_dressing_room_inventory_summary()`
Lihat ringkasan stok semua dressing room products.

```sql
SELECT * FROM get_dressing_room_inventory_summary()
```

### `get_rental_item_status_history()`
Lihat history status perubahan untuk satu item rental.

```sql
SELECT * FROM get_rental_item_status_history(
  p_rental_order_item_id => 123
)
```

## Frontend Hooks

### `useDressingRoomProducts()`
Fetch semua produk dressing room aktif.

```typescript
const { data: products, isLoading } = useDressingRoomProducts()
```

### `useDressingRoomProductVariants(productId?)`
Fetch varian produk (optional: filter by productId).

```typescript
const { data: variants } = useDressingRoomProductVariants(productId)
```

### `useDressingRoomInventorySummary()`
Fetch ringkasan stok via RPC.

```typescript
const { data: summary } = useDressingRoomInventorySummary()
```

### `useRentalItemStatusHistory(rentalOrderItemId)`
Fetch history status untuk satu item.

```typescript
const { data: history } = useRentalItemStatusHistory(itemId)
```

### `useUpdateRentalItemStatus()`
Mutation: update status item rental.

```typescript
const updateStatus = useUpdateRentalItemStatus()

await updateStatus.mutateAsync({
  rentalOrderItemId: 123,
  newStatus: 'in_laundry',
  reason: 'Cleaning',
  notes: 'Light stains',
  photoUrls: ['url1', 'url2']
})
```

### `useUpdateDressingRoomInventory()`
Mutation: update inventory varian.

```typescript
const updateInventory = useUpdateDressingRoomInventory()

await updateInventory.mutateAsync({
  variantId: 45,
  availableQty: 7,
  inLaundryQty: 2,
  damagedQty: 1
})
```

## Admin Pages Integration

### Store Page (Dressing Room Admin)
Di `frontend/src/pages/admin/StoreInventory.tsx`, tambahkan section untuk dressing room:

```
- Regular Products (existing)
- Dressing Room Products (baru)
  - View/edit products
  - Update inventory
  - Monitor rental items status
```

### Rental Orders Page
Di `frontend/src/pages/admin/RentalOrders.tsx`:

```
- View rental orders
- Expand untuk lihat items
- Per-item: 
  - Current status badge
  - Status history timeline
  - Update status form (dengan photo upload)
```

## Inventory Flow

```
┌─────────────┐
│ Total Stock │ (total_quantity)
└──────┬──────┘
       ├─ Available (available_quantity) → Can be rented
       ├─ Reserved (reserved_quantity) → In active rental
       ├─ In Laundry (in_laundry_quantity) → Being cleaned
       ├─ Damaged (damaged_quantity) → Can't be rented
       └─ (implicit) Lost or On Hold
```

**Example:**
```
Total: 10 items
├─ Available: 5 (ready to rent)
├─ Reserved: 2 (in active rentals)
├─ In Laundry: 2 (cleaning)
└─ Damaged: 1 (needs repair)
```

## RTL Invoice

Rental orders untuk dressing room memiliki flag `invoice_rtl = true`.

Ketika generate invoice:
- Jika `invoice_rtl` adalah true → gunakan CSS `direction: rtl`
- Ubah layout untuk align kanan
- Bilangan tetap left-aligned (konvensi)

## Relasi dengan Regular Products

**Important**: Tabel `products` dan `dressing_room_products` **TERPISAH**.

- Rental orders dari dressing room menggunakan `rental_order_items.dressing_room_product_variant_id`
- Regular products (shop) tetap menggunakan `rental_order_items.product_variant_id`
- Tidak ada sharing inventory antara keduanya

Jika ada product yang tersedia di kedua platform, harus diinput dua kali (sekali di products, sekali di dressing_room_products).

## Migration File

File migrasi: `20260526070000_add_dressing_room_products_system.sql`

Menjalankan:
```bash
npm run supabase:db:push
```

## Permissions (RLS)

- **Public**: Bisa read active products & variants (untuk public catalog)
- **Authenticated users**: Bisa read, create/update rental items
- **Admin**: Full access ke semua tabel
- **Dressing Room Admin**: Manage products & variants, track rentals

## Future Enhancements

- [ ] Auto-update `in_laundry_quantity` based on rental return date
- [ ] Laundry workflow: track laundry partner integration
- [ ] Damage detection: link to damage claim system
- [ ] Rating system: customer feedback per item condition
- [ ] Predictive stock: forecast demand based on lookbook
