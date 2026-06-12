# 🎯 Next Steps: Complete E-Commerce Integration

**Current Status:** Phase 1 Complete ✅  
**Last Updated:** 2026-06-10  
**Priority:** HIGH - Complete admin fulfillment workflow

---

## ✅ What's Done (Phase 1)

### 1. Shipping Data Capture ✅
- Customer dapat pilih shipping vs pickup
- RajaOngkir integration untuk calculate ongkir
- Address form dengan province/city/district selector
- Shipping cost calculator dengan cache localStorage
- Data tersimpan di database saat checkout

### 2. Payment Integration ✅
- Backend function updated untuk terima shipping data
- Shipping cost included dalam total payment
- DOKU invoice shows shipping sebagai line item terpisah
- Database schema extended dengan 9 shipping fields
- Backward compatible - existing pickup orders tidak terganggu

### 3. Database Ready ✅
- Migration file created: `20260610000000_add_shipping_fields_to_order_products.sql`
- Shipping fields: address, courier, service, cost, tracking, timestamps
- All fields nullable untuk backward compatibility
- Indexes added untuk performance

### 4. Ship Order Function ✅
- Edge function created: `ship-product-order`
- Admin-only access dengan role validation
- Input tracking number & mark order as shipped
- Prevents duplicate shipping
- Ready for WhatsApp notification integration

---

## 🚧 Phase 2: Admin UI Integration (NEXT!)

**Goal:** Allow admin staff to fulfill and ship orders

### Task 1: Update ProductOrdersHelpers
**File:** `frontend/src/pages/admin/product-orders/productOrdersHelpers.ts`

Add function to get shipping orders:
```typescript
export function getShippingOrders(orders: OrderSummaryRow[]): OrderSummaryRow[] {
  return orders.filter(
    (o) =>
      o.payment_status === 'paid' &&
      o.shipping_courier && // Has courier (not pickup)
      !o.tracking_number && // Not yet shipped
      o.status !== 'cancelled' &&
      o.status !== 'expired'
  );
}
```

Update `getDisplayOrders()` to handle 'shipping' tab:
```typescript
export function getDisplayOrders(
  activeTab: ProductOrdersTab,
  pendingOrders: OrderSummaryRow[],
  pendingPaymentOrders: OrderSummaryRow[],
  todaysOrders: OrderSummaryRow[],
  completedOrders: OrderSummaryRow[],
  shippingOrders: OrderSummaryRow[] // NEW
): OrderSummaryRow[] {
  switch (activeTab) {
    case 'pending_payment': return pendingPaymentOrders;
    case 'pending_pickup': return pendingOrders;
    case 'today': return todaysOrders;
    case 'completed': return completedOrders;
    case 'shipping': return shippingOrders; // NEW
    default: return [];
  }
}
```

### Task 2: Update ProductOrdersController
**File:** `frontend/src/pages/admin/product-orders/useProductOrdersController.ts`

Add shipping state and handler:
```typescript
const [shipModalOpen, setShipModalOpen] = useState(false);

// Add shipping orders memoization
const shippingOrders = useMemo(() => getShippingOrders(safeOrders), [safeOrders]);

// Add ship mutation
const shipOrderMutation = useMutation({
  mutationFn: async ({ orderNumber, trackingNumber }: { orderNumber: string; trackingNumber: string }) =>
    invokeSupabaseFunction({
      functionName: 'ship-product-order',
      body: { orderNumber, trackingNumber },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    }),
  onSuccess: async (_, { orderNumber }) => {
    setShipModalOpen(false);
    setSelectedPickupCode(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.productOrders() });
    showToast('success', `Order ${orderNumber} berhasil dikirim!`);
  },
  onError: (error) => {
    showToast('error', error instanceof Error ? error.message : 'Gagal mengirim order');
  },
});

const handleShipOrder = useCallback(async (trackingNumber: string) => {
  const orderNumber = detailsQuery.data?.order.order_number;
  if (!orderNumber) return;
  await shipOrderMutation.mutateAsync({ orderNumber, trackingNumber });
}, [shipOrderMutation, detailsQuery.data?.order.order_number]);

// Add to return object
return {
  // ... existing fields
  shippingOrders,
  shipModalOpen,
  setShipModalOpen,
  handleShipOrder,
  shippingSubmitting: shipOrderMutation.isPending,
};
```

### Task 3: Update ProductOrdersListSection
**File:** `frontend/src/pages/admin/product-orders/ProductOrdersListSection.tsx`

Add "Shipping" tab:
```typescript
<button
  onClick={() => onChangeTab('shipping')}
  className={`tab-button ${activeTab === 'shipping' ? 'active' : ''}`}
>
  <span className="material-symbols-outlined">local_shipping</span>
  <span>Perlu Dikirim</span>
  {shippingCount > 0 && (
    <span className="badge">{shippingCount}</span>
  )}
</button>
```

### Task 4: Update ProductOrderDetailsModal
**File:** `frontend/src/pages/admin/product-orders/ProductOrderDetailsModal.tsx`

Add shipping info display and "Ship Order" button:
```typescript
{/* Shipping Info Section (if delivery order) */}
{order.shipping_courier && (
  <div className="bg-blue-50 rounded-lg p-4">
    <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2">
      <span className="material-symbols-outlined">local_shipping</span>
      <span>Info Pengiriman</span>
    </div>
    <div className="space-y-1 text-sm">
      <p><strong>Kurir:</strong> {order.shipping_courier.toUpperCase()} {order.shipping_service}</p>
      <p><strong>Ongkir:</strong> Rp {order.shipping_cost?.toLocaleString('id-ID')}</p>
      {order.shipping_address && (
        <p className="text-gray-700"><strong>Alamat:</strong> {order.shipping_address}</p>
      )}
      {order.tracking_number && (
        <p className="text-green-700"><strong>Resi:</strong> {order.tracking_number}</p>
      )}
      {order.shipped_at && (
        <p className="text-gray-600"><strong>Dikirim:</strong> {new Date(order.shipped_at).toLocaleString('id-ID')}</p>
      )}
    </div>
  </div>
)}

{/* Ship Order Button (if paid and not shipped) */}
{order.payment_status === 'paid' && order.shipping_courier && !order.tracking_number && (
  <button
    onClick={onShipOrder}
    disabled={submitting}
    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
  >
    <span className="material-symbols-outlined">send</span>
    <span>Kirim Pesanan</span>
  </button>
)}
```

### Task 5: Integrate ShipOrderModal
**File:** `frontend/src/pages/admin/ProductOrders.tsx`

Add modal to page:
```typescript
import { ShipOrderModal } from './product-orders/ShipOrderModal';

// In component body
<ShipOrderModal
  isOpen={shipModalOpen}
  orderDetails={details}
  onClose={() => setShipModalOpen(false)}
  onShip={handleShipOrder}
  submitting={shippingSubmitting}
/>
```

Update detail modal to trigger ship modal:
```typescript
<ProductOrderDetailsModal
  details={details}
  submitting={submitting}
  actionError={actionError}
  onClose={handleCloseDetails}
  onCompletePickup={handleCompletePickup}
  onShipOrder={() => setShipModalOpen(true)} // NEW
/>
```

### Task 6: Update Menu Badge
**File:** `frontend/src/pages/admin/product-orders/productOrdersHelpers.ts`

Update menu badge to include shipping count:
```typescript
export function buildProductOrdersMenuSections(
  pendingCount: number,
  shippingCount: number, // NEW
  baseMenuSections: AdminMenuSection[]
): AdminMenuSection[] {
  const totalPending = pendingCount + shippingCount; // NEW
  return baseMenuSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.id === 'product-orders' && totalPending > 0) {
        return { ...item, badge: `${totalPending}` };
      }
      return item;
    }),
  }));
}
```

---

## 📋 Deployment Checklist (Phase 2)

### Step 1: Run Migration
```bash
npm run supabase:db:push
```

Verify columns added:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_products'
  AND column_name IN ('shipping_address', 'shipping_courier', 'tracking_number', 'shipped_at')
ORDER BY column_name;
```

### Step 2: Test Backend Functions
```bash
# Test create-doku-product-checkout with shipping
curl -X POST https://your-project.supabase.co/functions/v1/create-doku-product-checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerAddress": "Jl. Test No. 123",
    "shippingCourier": "jne",
    "shippingService": "REG",
    "shippingCost": 15000
  }'

# Test ship-product-order
curl -X POST https://your-project.supabase.co/functions/v1/ship-product-order \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "PRD-1234567890-ABCDE",
    "trackingNumber": "JNE1234567890123"
  }'
```

### Step 3: Test Frontend Flow
1. ✅ Customer checkout with delivery
2. ✅ Payment includes shipping cost
3. ✅ Order saved with shipping data
4. 🚧 Admin sees order in "Shipping" tab
5. 🚧 Admin clicks order to view details
6. 🚧 Admin clicks "Kirim Pesanan" button
7. 🚧 Admin inputs tracking number
8. 🚧 Order marked as shipped
9. 🚧 Customer receives notification (future)

### Step 4: Verify Data
```sql
-- Check shipping orders needing fulfillment
SELECT 
  order_number,
  shipping_courier,
  shipping_service,
  shipping_cost,
  tracking_number,
  shipped_at,
  payment_status,
  status
FROM order_products
WHERE shipping_courier IS NOT NULL
  AND payment_status = 'paid'
ORDER BY created_at DESC
LIMIT 10;

-- Check shipped orders
SELECT 
  order_number,
  shipping_courier,
  tracking_number,
  shipped_at,
  status
FROM order_products
WHERE tracking_number IS NOT NULL
ORDER BY shipped_at DESC
LIMIT 10;
```

---

## 🎉 Phase 3: Customer Order Tracking (Future)

**Goal:** Let customers track their orders

### Tasks:
1. Create `/account/orders` page
   - List all user orders with status
   - Filter by status: paid, shipped, completed
   - Show order timeline

2. Create `/account/orders/:orderNumber` detail page
   - Order details with items
   - Shipping address and courier info
   - Tracking number display
   - Status timeline (paid → shipped → delivered)
   - Link to courier tracking (optional)

3. Order status badges
   - Awaiting Payment (yellow)
   - Paid (blue)
   - Shipped (purple)
   - Completed (green)

4. Customer notifications
   - Email/WhatsApp when order paid
   - Email/WhatsApp when order shipped (with resi)
   - Email/WhatsApp delivery confirmation

---

## 🎁 Phase 4: Enhancements (Nice-to-Have)

### 1. Courier Tracking API Integration
Integrate with JNE/TIKI/POS APIs to show real-time tracking:
- Fetch tracking history from courier
- Display delivery status updates
- Show current package location
- Estimated delivery time

### 2. Automatic Order Completion
Auto-complete orders after X days of shipment:
- Run cron job daily
- Check shipped orders older than 7 days
- Mark as completed automatically
- Send delivery confirmation request

### 3. Return/Refund Flow
Handle product returns for shipped orders:
- Customer request return
- Admin approve/reject
- Generate return label
- Process refund after return received

### 4. Bulk Operations
Admin efficiency features:
- Bulk print shipping labels
- Bulk update tracking numbers (CSV upload)
- Bulk mark as shipped
- Export shipping report

### 5. Analytics Dashboard
Shipping performance metrics:
- Average shipping time by courier
- On-time delivery rate
- Cost per shipment
- Most popular shipping methods
- Revenue by delivery region

---

## 🔥 Quick Start: Deploy Phase 2 Now

```bash
# 1. Push database migration
npm run supabase:db:push

# 2. Update frontend files (6 tasks above)
#    - productOrdersHelpers.ts
#    - useProductOrdersController.ts
#    - ProductOrdersListSection.tsx
#    - ProductOrderDetailsModal.tsx
#    - ProductOrders.tsx
#    - Import ShipOrderModal

# 3. Test locally
npm run dev

# 4. Build and deploy
npm run build
# Deploy to Vercel or your hosting

# 5. Verify production
# - Create test delivery order
# - Check admin can see in "Shipping" tab
# - Input tracking number
# - Verify order marked as shipped
```

---

## 📊 Success Metrics

**Phase 1 (Complete):**
- ✅ Customers can select shipping method
- ✅ Shipping cost calculated correctly
- ✅ Payment includes shipping
- ✅ Orders saved with shipping data

**Phase 2 (In Progress):**
- 🎯 Admin can view orders needing shipment
- 🎯 Admin can input tracking numbers
- 🎯 Orders marked as shipped automatically
- 🎯 Shipping data visible in order details

**Phase 3 (Future):**
- ⏳ Customers can view order history
- ⏳ Customers can track shipments
- ⏳ WhatsApp notifications sent

**Phase 4 (Future):**
- ⏳ Courier API integration working
- ⏳ Auto-completion running
- ⏳ Return flow implemented
- ⏳ Analytics dashboard live

---

## 💪 Why This Matters

**Business Impact:**
- ✅ Complete e-commerce functionality
- ✅ Customer convenience (home delivery)
- ✅ Wider market reach (not limited to pickup)
- ✅ Professional order fulfillment
- ✅ Transparent shipping costs

**Technical Excellence:**
- ✅ Backward compatible (no breaking changes)
- ✅ Scalable architecture
- ✅ Clean data model
- ✅ Admin-friendly UI
- ✅ Customer-friendly tracking

---

## 📞 Need Help?

**Reference Documents:**
- Full roadmap: `SHIPPING_INTEGRATION_COMPLETE.md`
- Phase 1 summary: `SHIPPING_PHASE1_COMPLETE.md`
- RajaOngkir API: `RAJAONGKIR_INTEGRATION_STATUS.md`
- DOKU payments: `docs/runbooks/doku-payments.md`

**Questions to Consider:**
- Which courier tracking APIs should we integrate?
- When should orders auto-complete (7 days? 14 days)?
- Should we send SMS in addition to WhatsApp?
- Do we need return/refund flow immediately?

---

**Status:** Phase 1 deployed ✅ | Phase 2 implementation ready 🚀 | Phase 3-4 roadmap defined 📋

**Next Action:** Complete 6 frontend tasks above to enable admin shipping workflow!
