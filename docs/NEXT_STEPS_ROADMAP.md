---
title: "Next Steps Roadmap - May 20, 2026"
---

# 🚀 Development Roadmap - Next Phases

**Created:** May 20, 2026  
**Session Status:** ✅ SECURITY HARDENING COMPLETE  
**Ready for:** Feature Development & Enhancements

---

## 📊 **What's Complete (This Session)**

| Category | Status | Impact |
|----------|--------|--------|
| **Loyalty Tier System** | ✅ PROD | Rank persists across redemptions |
| **Rate Limiting** | ✅ PROD | Prevents brute force attacks |
| **Secure Headers** | ✅ PROD | HSTS, X-Frame-Options protection |
| **Admin Routes** | ✅ PROD | 29 routes protected with ProtectedRoute |
| **Audit Logging** | ✅ PROD | Immutable audit trail for compliance |
| **Input Validation** | ✅ PROD | Standardized RPC parameter checks |
| **Security Vulnerabilities** | ✅ FIXED | 11 → 0 vulnerabilities |

**Exit Status:** Build passing ✅ | Tests ready ✅ | Production ready ✅

---

## 🎯 **Phase 1: Admin Division System** (HIGH PRIORITY)
**Estimated:** 8-10 hours | **Timeline:** Week 1  
**Purpose:** Separate backoffice by division (Tiket, Dressing Room, Retail)

### Why This Matters
- Role segregation: Ticket admin ≠ Dressing room admin ≠ Retail manager
- Data isolation: Ticket sales data only visible to ticket admins
- Compliance: Each division has its own audit trail

### Deliverables
1. **Database** (2-3 hours)
   - [ ] Add `divisions` enum table (ticket, dressing_room, retail)
   - [ ] Create `admin_divisions` mapping table (admin → division)
   - [ ] Update RLS policies: data isolation by division
   - [ ] Migration: `20260521_add_division_roles.sql`

2. **Backend** (2 hours)
   - [ ] Function: `get_admin_divisions()` - return divisions for user
   - [ ] Function: `check_division_access()` - verify user can access resource
   - [ ] Update `requireAdminContext()` to include division context
   - [ ] Add permission enforcement to all admin RPCs

3. **Frontend** (4-5 hours)
   - [ ] Hook: `useAdminDivisions()` - fetch user's divisions
   - [ ] Component: `<DivisionFilter>` - sidebar division selector
   - [ ] Update all `/admin/*` pages: show only division-relevant data
   - [ ] Dashboard router: redirect by division on login
   - [ ] Page: `/admin/divisions` - division management (for super_admin)

### Example: Before vs After
```typescript
// BEFORE
const orders = supabase.from('orders').select('*'); // All orders!

// AFTER
const orders = supabase
  .from('orders')
  .select('*')
  .eq('division', userDivision) // Only this division's orders
  .in('division', userDivisions); // Only user's assigned divisions
```

### Files to Create/Modify
```
supabase/migrations/20260521_add_division_roles.sql (NEW)
supabase/functions/_shared/admin.ts (MODIFY)
frontend/src/auth/adminRole.ts (MODIFY)
frontend/src/hooks/useAdminDivisions.ts (NEW)
frontend/src/components/admin/DivisionFilter.tsx (NEW)
frontend/src/pages/admin/divisions/DivisionManager.tsx (NEW)
```

---

## 🎯 **Phase 2: Admin Audit Logging** (HIGH PRIORITY)
**Estimated:** 7-8 hours | **Timeline:** Week 1-2  
**Purpose:** Track all admin actions for compliance & troubleshooting

### Why This Matters
- Compliance: Record who changed what, when
- Troubleshooting: Find who deleted that voucher/changed price
- Accountability: Admin actions tied to specific user
- Legal: Audit trail for disputes/refunds

### Deliverables
1. **Database** (Already Done! ✅)
   - ✅ `audit_logs` table created (20260520110000)
   - ✅ `log_audit_event()` function exists
   - ✅ RLS policies: admins can read, immutable
   - ✅ Triggers prepared: role changes logging ready

   **Remaining:**
   - [ ] Add triggers for more actions: voucher changes, price updates, stock changes
   - [ ] Create materialized view for fast queries

2. **Backend** (2 hours)
   - [ ] Trigger: `audit_voucher_changes` - log all voucher UPDATEs
   - [ ] Trigger: `audit_price_changes` - log product price changes
   - [ ] Trigger: `audit_stock_changes` - log inventory adjustments
   - [ ] Function: `log_admin_action()` wrapper for edge functions

3. **Frontend** (3-4 hours)
   - [ ] Page: `/admin/audit-logs` - view audit log table
   - [ ] Filters: date range, admin, action type, resource
   - [ ] Export: CSV download of audit logs
   - [ ] Detail view: show before/after values
   - [ ] Integration: auto-log admin form submissions

### Example Audit Log Entry
```json
{
  "id": 12345,
  "user_id": "admin-123",
  "action": "voucher_modified",
  "table_name": "vouchers",
  "record_id": "voucher-abc",
  "old_values": {"discount_value": 10000, "quota": 100},
  "new_values": {"discount_value": 15000, "quota": 50},
  "description": "Updated Spring Voucher discount & quota",
  "created_at": "2026-05-21T10:30:00Z"
}
```

### Files to Create/Modify
```
supabase/migrations/20260521_add_audit_triggers.sql (NEW)
supabase/functions/_shared/auditLogger.ts (NEW)
frontend/src/pages/admin/AuditLogsPage.tsx (NEW)
frontend/src/components/admin/AuditLogTable.tsx (NEW)
frontend/src/hooks/useAuditLogs.ts (NEW)
docs/runbooks/audit-logging-guide.md (UPDATE)
```

---

## 🎯 **Phase 3: SPARK CLUB Enhancements** (MEDIUM PRIORITY)
**Estimated:** 12 hours | **Timeline:** Week 2  
**Purpose:** Complete loyalty system with admin UI + referral codes

### Part 1: Admin Points Manager (2 hours)
**Why:** Admins need to view/adjust customer points manually

- [ ] Page: `/admin/loyalty-points` - customer points list
- [ ] Features:
  - Search by email/phone
  - View current points & tier level
  - Manual point adjustment (with audit log)
  - View loyalty history
  - Export points report

### Part 2: User Points Dashboard (2 hours)
**Why:** Customers want to see points balance & redemption options

- [ ] Page: `/account/my-points` (or `/spark-club/my-points`)
- [ ] Features:
  - Show current points + tier level + tier name
  - Show rank progress (%)
  - Display tier benefits
  - View recent transactions
  - Redeem points button

### Part 3: Referral Code System (8 hours)
**Why:** Growth mechanism - incentivize customer referrals

#### Database (1.5 hours)
```sql
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(12) UNIQUE,
  creator_user_id UUID REFERENCES auth.users,
  is_active BOOLEAN DEFAULT true,
  bonus_points INTEGER DEFAULT 100,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE referral_uses (
  id UUID PRIMARY KEY,
  referral_code_id UUID REFERENCES referral_codes,
  referred_user_id UUID REFERENCES auth.users,
  points_awarded INTEGER,
  created_at TIMESTAMP
);
```

#### Backend (3 hours)
```
POST /api/referral/generate
- Generate unique 8-char code (e.g., SPARK2026)
- Return: code + share URL

POST /api/referral/apply
- Validate referral code
- Award bonus points to referrer & referee
- Mark code as used
- Return: bonus points earned
```

#### Frontend (3.5 hours)
```
1. Component: <ReferralCodeShare>
   - Display user's referral code
   - Copy to clipboard
   - Share via WhatsApp/Email/Social buttons
   - Show referral stats (# of referrals, points earned)

2. Component: <ReferralCodeInput>
   - Used during checkout or signup
   - Input code → validate → show bonus
   - "You'll earn +100 points with this code!"

3. Page: /account/referrals
   - My referral code
   - List of people I referred
   - Total bonus points earned
   - Referral leaderboard (optional)
```

### Example User Flow
```
1. User goes to SPARK CLUB
2. Clicks "Invite friends"
3. Gets referral code: SPARKJOHN2026
4. Shares via WhatsApp: "Use my code SPARKJOHN2026 for +100 bonus points!"
5. Friend enters code at checkout
6. Both get +100 points
7. User sees referral in "My Referrals" page
```

### Files to Create
```
supabase/migrations/20260521_add_referral_system.sql (NEW)
supabase/functions/api/referral-generate/index.ts (NEW)
supabase/functions/api/referral-apply/index.ts (NEW)
frontend/src/hooks/useReferralCode.ts (NEW)
frontend/src/components/ReferralCodeShare.tsx (NEW)
frontend/src/components/ReferralCodeInput.tsx (NEW)
frontend/src/pages/admin/LoyaltyPointsManager.tsx (NEW)
frontend/src/pages/account/MyPoints.tsx (NEW)
frontend/src/pages/account/MyReferrals.tsx (NEW)
```

---

## 🎯 **Phase 4: Performance & Testing** (MEDIUM PRIORITY)
**Estimated:** 6-8 hours | **Timeline:** Week 3

### Database Optimization
- [ ] Add indexes for frequently filtered columns
- [ ] Analyze query performance (slow query log)
- [ ] Optimize checkout flow queries
- [ ] Cache strategy for product catalog

### Testing
- [ ] Unit tests: utility functions
- [ ] Integration tests: checkout flow
- [ ] E2E tests: full user journey
- [ ] Load testing: rate limiting effectiveness
- [ ] Security: penetration test checklist

### Monitoring
- [ ] Setup error tracking (Sentry/LogRocket)
- [ ] Performance monitoring (Web Vitals)
- [ ] Uptime monitoring
- [ ] Alert system for critical errors

---

## 📅 **Recommended Timeline**

| Week | Focus | Hours | Status |
|------|-------|-------|--------|
| **Week 1** | Admin Division System + Audit Triggers | 15-18 | Not started |
| **Week 2** | SPARK CLUB Enhancements | 12 | Not started |
| **Week 3** | Testing + Performance + Deployment | 8-10 | Not started |
| **TOTAL** | Full feature set | 35-40 | On track |

---

## ✅ **Next Immediate Action (Tomorrow)**

Pick ONE to start:

### A) **Admin Division System** (Recommended)
- **Why:** Core backoffice feature - unlocks many other features
- **Start:** Create migration `20260521_add_division_roles.sql`
- **Time to first PR:** 2-3 hours

### B) **Admin Audit Logging - Triggers**
- **Why:** Quick win - most infrastructure already done
- **Start:** Create triggers for voucher/price/stock changes
- **Time to first PR:** 1-2 hours

### C) **SPARK CLUB UI** (Easier starting point)
- **Why:** No database changes - just UI for existing data
- **Start:** Create `/admin/loyalty-points` page
- **Time to first PR:** 2 hours

---

## 📋 **Decision Matrix**

| Feature | Complexity | Impact | Time | Recommend? |
|---------|-----------|--------|------|-----------|
| Division System | High | High | 10h | ⭐⭐⭐ |
| Audit Logging | Medium | High | 8h | ⭐⭐⭐ |
| SPARK CLUB | Medium | Medium | 12h | ⭐⭐ |
| Testing/Perf | Medium | Medium | 10h | ⭐⭐ |

**My Vote:** Start with **Admin Division System** - it's the foundation for everything else. Once roles are divided, audit logging becomes per-division, SPARK CLUB rewards can be division-specific, etc.

---

## 🚀 **Ready When You Are**

Which would you like to start?

1. **Admin Division System** - Full role segregation
2. **Audit Logging Triggers** - Complete audit trail
3. **SPARK CLUB UI** - Loyalty dashboard
4. **Multiple (parallel)** - Attack several fronts
5. **Something else** - Different priority

Let me know and we'll kick off Phase 1! 🎯
