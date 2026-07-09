# Website Backoffice Feature Checklist

**Last Updated:** May 15, 2026  
**Status:** Audit Complete - Implementation Guide Ready

---

## 1. ✅ Division-Based Admin Accounts (Role Segregation)

### Current Status
- **Partial Implementation** - Basic role system exists but not division-specific

### What's Implemented
- ✅ Role table: `user_role_assignments` (user_id, role_name)
- ✅ Roles defined: `admin`, `super_admin`, `starguide` (entrance scan), `kasir` (cashier)
- ✅ Frontend role detection: `lookupUserRole()` in `frontend/src/auth/adminRole.ts`
- ✅ Edge function admin check: `requireAdminContext()` in `supabase/functions/_shared/admin.ts`
- ✅ Role-based routing: Login redirects to correct dashboard (admin vs kasir)

### What's NOT Implemented
- ❌ Division-specific roles (tiket, dressing room, retail division managers)
- ❌ Division access control/permission enforcement
- ❌ Dashboard separation per division
- ❌ Role-based data access policies (RLS)

### Files to Update
```
1. supabase/migrations/[new]_add_division_roles.sql
   - Add division enum: ticket, dressing_room, retail
   - Add admin_divisions table (admin -> division mapping)
   - Create RLS policies per division

2. supabase/functions/_shared/admin.ts
   - Add division context extraction
   - Add permission check function

3. frontend/src/auth/adminRole.ts
   - Add getDivisionAccess() function

4. frontend/src/components/admin/
   - Create role-based dashboard routers
   - Add division sidebar filters
```

### Implementation Effort
- **Database:** 2-3 hours
- **Backend:** 2 hours
- **Frontend:** 4-5 hours
- **Total:** 8-10 hours

### Priority
🔴 **HIGH** - Core backoffice separation

---

## 2. ❌ Admin Activity Logging / Audit Trail

### Current Status
- **Not Implemented** - No comprehensive admin action logging

### What's Implemented
- ✅ Session error logs (client-side): `sessionErrorHandler.ts`
- ✅ Webhook logs: `webhook_logs` table (payment webhooks only)
- ✅ WhatsApp message logs: `whatsapp_messages` table

### What's NOT Implemented
- ❌ Admin action audit table
- ❌ Logging middleware for admin operations
- ❌ Change tracking (who changed what, when)
- ❌ Dashboard to view audit logs

### Files to Create
```
1. supabase/migrations/[new]_create_admin_audit_log.sql
   - admin_audit_logs table
   - Fields: id, admin_id, action, resource_type, resource_id, 
             old_value, new_value, timestamp, ip_address, user_agent
   - Indexes & RLS policies

2. supabase/functions/admin-activity-logger/index.ts
   - POST endpoint to log admin actions
   - Called from frontend after admin operations

3. frontend/src/lib/adminAuditLogger.ts
   - Helper to send audit logs to edge function
   - Auto-capture operation details

4. frontend/src/pages/admin/AuditLogsPage.tsx
   - Table view of audit logs
   - Filter by date, admin, resource type, action
```

### Implementation Effort
- **Database:** 2 hours
- **Backend:** 2 hours
- **Frontend:** 3-4 hours
- **Total:** 7-8 hours

### Priority
🔴 **HIGH** - Compliance & accountability

---

## 3. ✅ WhatsApp Reminders & Barcode Delivery After Ticket Purchase

### Current Status
- **FULLY IMPLEMENTED** ✨

### What's Working
- ✅ WhatsApp invoice sent automatically after payment
- ✅ Barcode (ticket code) included in message
- ✅ Phone number normalization (08x → 62x)
- ✅ Two integration options:
  - DOKU WhatsApp API (template-based)
  - Fonnte API (text-based)
- ✅ Duplicate prevention
- ✅ Error handling & logging to `whatsapp_messages` table

### How It Works
```
Payment Webhook → Order Status = 'paid' 
→ sendWhatsAppInvoiceViaFontneIfNeeded() 
→ Fetch customer phone from profiles 
→ Build ticket confirmation message 
→ Send via Fonnte API 
→ Customer receives WhatsApp with barcode
```

### Files
- **Main:** `supabase/functions/send-whatsapp-invoice/index.ts` (350 lines)
- **Shared:** `supabase/functions/_shared/fonnte.ts`
- **Payments:** `supabase/functions/_shared/payment-effects.ts`
- **Logs:** `whatsapp_messages` table
- **Docs:** `docs/runbooks/WHATSAPP_README.md`

### Configuration
- Environment: `FONNTE_API_TOKEN` or `DOKU_WHATSAPP_*` vars
- Message format: Includes name, invoice#, date, time, qty, venue

### Priority
🟢 **DONE** - No action needed

---

## 4. ✅ Sales Timing (Penjualan)

### Current Status
- **WORKING** - No changes needed

### What's Working
- ✅ Ticket availability by time slot
- ✅ Session time tracking: `selected_time_slots` in order_items
- ✅ Session expiry logic (150-min sessions)
- ✅ Capacity management per time slot

### No Implementation Required
🟢 **DONE**

---

## 5. ⚠️ SPARK CLUB - Loyalty Points System

### Current Status
- **Partial Implementation** - Points working, referral codes NOT implemented

### 5.1 Points System (1 Point Per Ticket)

#### ✅ What's Implemented
- ✅ `customer_loyalty_points` table
- ✅ `loyalty_points_history` table (audit trail)
- ✅ `award_loyalty_points()` RPC function
- ✅ Auto-award on ticket purchase (payment webhook)
- ✅ User can view own points (RLS policy exists)
- ✅ SPARK CLUB page routes: `/shop` and `/spark-club`
- ✅ Product catalog integration

#### How It Works
```
Ticket Purchase → Payment Success 
→ issueTickets() 
→ award_loyalty_points(user_id, quantity) 
→ +1 point per ticket 
→ Stored in customer_loyalty_points
```

#### Files
- **DB:** `supabase/migrations/20260512000000_add_loyalty_points_system.sql`
- **RPC:** `award_loyalty_points()` function
- **Frontend:** `frontend/src/pages/SparkClub.tsx`
- **Docs:** Reference in `docs/runbooks/whatsapp-notifications.md`

#### Files to Create/Update
```
1. frontend/src/pages/admin/LoyaltyPointsManager.tsx
   - View points by user
   - Manual point adjustment (admin)
   - Export points history

2. frontend/src/hooks/useLoyaltyPoints.ts
   - Query hook for user points
   - History hook

3. frontend/src/pages/account/MyPoints.tsx
   - User-facing points dashboard
   - Show points balance & history
```

### 5.2 Referral Code System

#### ❌ What's NOT Implemented
- ❌ Referral codes table
- ❌ Referral tracking logic
- ❌ Bonus points for referrer/referee
- ❌ Referral dashboard
- ❌ Share referral code UI

#### Files to Create
```
1. supabase/migrations/[new]_add_referral_system.sql
   - referral_codes table
     - id, code, creator_user_id, created_at, is_active
   - referral_uses table
     - id, referral_code_id, referred_user_id, used_at, points_awarded
   - RLS policies

2. supabase/functions/generate-referral-code/index.ts
   - POST endpoint
   - Generate unique code for user
   - Returns: code, share_url

3. supabase/functions/apply-referral-code/index.ts
   - POST endpoint
   - Validate referral code
   - Award bonus points to both parties
   - Used during checkout/signup

4. frontend/src/hooks/useReferralCode.ts
   - Generate code hook
   - Apply code hook
   - Track referral count

5. frontend/src/components/ReferralShare.tsx
   - Display user's referral code
   - Copy to clipboard button
   - Share via social/WhatsApp

6. frontend/src/pages/account/MyReferrals.tsx
   - Show referral code
   - List of referred users
   - Bonus points earned
```

### Implementation Effort - SPARK CLUB

#### Points System (Already Done)
- ✅ Database: DONE
- ✅ Backend: DONE
- ✅ Frontend Integration: Needs polish
- **Remaining:** 2 hours (admin UI + user dashboard)

#### Referral System (To Do)
- Database: 2 hours
- Backend: 3 hours
- Frontend: 3 hours
- **Total:** 8 hours

### Priority
- Points Dashboard: 🟡 **MEDIUM** (2 hours)
- Referral System: 🟡 **MEDIUM** (8 hours)

---

## Implementation Timeline

### Phase 1: Audit & Planning (COMPLETE)
- ✅ Codebase audit
- ✅ Feature status check
- ✅ Create this checklist

### Phase 2: Admin Division System (Week 1)
- [ ] Database migrations
- [ ] Backend role enforcement
- [ ] Frontend role-based routing
- **Est:** 8-10 hours

### Phase 3: Admin Audit Logging (Week 1-2)
- [ ] Audit table setup
- [ ] Middleware implementation
- [ ] Frontend audit viewer
- **Est:** 7-8 hours

### Phase 4: SPARK CLUB Enhancements (Week 2)
- [ ] Loyalty points admin UI (2 hours)
- [ ] User points dashboard (2 hours)
- [ ] Referral code system (8 hours)
- **Est:** 12 hours total

### Phase 5: Testing & Deployment (Week 3)
- [ ] Integration testing
- [ ] UAT with team
- [ ] Production deployment
- **Est:** 4-5 hours

---

## Summary Table

| Feature | Status | Effort | Priority |
|---------|--------|--------|----------|
| Division Admin Roles | ⚙️ Partial | 10h | 🔴 HIGH |
| Admin Audit Logging | ❌ Missing | 8h | 🔴 HIGH |
| WhatsApp + Barcode | ✅ Done | - | - |
| Sales Timing | ✅ Working | - | - |
| Loyalty Points | ✅ Points Only | 2h (UI) | 🟡 MED |
| Referral Codes | ❌ Missing | 8h | 🟡 MED |

**Total Implementation Time:** ~46 hours over 3 weeks

---

## Next Steps

1. ✅ **Review this checklist** with your team
2. **Pick priority:** Start with division roles + audit logging (critical for compliance)
3. **Create issues** for each feature
4. **Assign owners** per module
5. **Start with Phase 2** (Admin Division System)

Would you like me to start implementation on any of these features?
