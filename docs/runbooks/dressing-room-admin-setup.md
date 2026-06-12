# Dressing Room Admin Setup Guide

**Date:** May 15, 2026  
**Account:** dress@gmail.com | pin832295  
**Role:** dressing_room_admin  
**Access:** Dressing room/rental dashboard only

---

## ✅ What Was Created

### 1. Database Setup
- ✅ Migration file: `20260515000000_add_dressing_room_admin_role.sql`
- ✅ New role added to `user_role_assignments`
- ✅ Role name: `dressing_room_admin`

### 2. Frontend Updates
- ✅ Updated `ADMIN_ROLES` set to include: `dressing_room_admin`, `ticket_admin`, `retail_admin`
- ✅ Created `AdminDashboardRouter.tsx` for role-based routing
- ✅ Routes user to `/admin/dressing-room-dashboard`

### 3. User Account Script
- ✅ Created: `scripts/create-dressing-room-admin.mts`
- ✅ Automatically creates auth user + role assignment

---

## 🚀 Setup Steps

### Step 1: Run User Creation Script

```bash
# Install dependencies (if not done)
npm install

# Run the account creation script
npx ts-node scripts/create-dressing-room-admin.mts
```

**Expected Output:**
```
📝 Creating dressing room admin account...
   Email: dress@gmail.com
   Role: dressing_room_admin

1️⃣  Creating auth user...
✅ Auth user created: [user-id]

2️⃣  Assigning dressing_room_admin role...
✅ Role assigned

3️⃣  Creating/verifying profile...
✅ Profile created

✨ Dressing room admin account created successfully!
```

### Step 2: Deploy Database Migration

```bash
# Push migration to database
npm run supabase:db:push
```

### Step 3: Create Dressing Room Dashboard

Create the dashboard component at `frontend/src/pages/admin/DressingRoomDashboard.tsx`:

```tsx
import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { lookupUserRole } from '../../auth/adminRole'
import { useNavigate } from 'react-router-dom'

export const DressingRoomDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Verify user has dressing_room_admin role
    const verifyAccess = async () => {
      if (!user?.id) {
        navigate('/login')
        return
      }

      const result = await lookupUserRole(user.id)
      if (result.ok && result.role !== 'dressing_room_admin') {
        // User has different role, redirect
        navigate('/admin/dashboard')
      }
    }

    verifyAccess()
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            👗 Dressing Room Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage rental collections and lookbook entries
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Collection Management */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Collections
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Manage rental collections and outfits
            </p>
            <button className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
              View Collections
            </button>
          </div>

          {/* Lookbook Management */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Lookbooks
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Manage fashion lookbook entries and looks
            </p>
            <button className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
              View Lookbooks
            </button>
          </div>

          {/* Orders & Rentals */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Rentals
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              View and manage rental orders
            </p>
            <button className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
              View Rentals
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DressingRoomDashboard
```

### Step 4: Add Route to Admin Routes

Update `frontend/src/app/routes/adminRoutes.ts`:

```typescript
import { lazy } from 'react'
import type { AppRouteConfig } from './routeTypes'

const AdminDashboard = lazy(() => import('../../pages/admin/AdminDashboard'))
const CashierDashboard = lazy(() => import('../../pages/admin/CashierDashboard'))
const DressingRoomDashboard = lazy(() => import('../../pages/admin/DressingRoomDashboard'))

export const adminRouteConfigs: AppRouteConfig[] = [
  { path: 'dashboard', Page: AdminDashboard },
  { path: 'cashier-dashboard', Page: CashierDashboard },
  { path: 'dressing-room-dashboard', Page: DressingRoomDashboard },
  // ... other routes
]
```

### Step 5: Update Login Router

Update `frontend/src/pages/Login.tsx` to use the new router:

```typescript
// After successful login
const roleResult = await lookupUserRole(userId)

if (roleResult.ok) {
  const role = roleResult.role?.toLowerCase()
  
  switch (role) {
    case 'dressing_room_admin':
      navigate('/admin/dressing-room-dashboard')
      break
    case 'kasir':
      navigate('/admin/cashier-dashboard')
      break
    default:
      navigate('/admin/dashboard')
  }
} else {
  navigate('/')
}
```

---

## 🔐 Access Control

### What dress@gmail.com CAN Access
- ✅ Dressing room collections
- ✅ Lookbook management
- ✅ Rental orders
- ✅ Their profile settings

### What dress@gmail.com CANNOT Access
- ❌ Ticket dashboard
- ❌ Product retail management
- ❌ User management
- ❌ Payment settings
- ❌ Main admin dashboard

### How It Works

1. User logs in with `dress@gmail.com` / `pin832295`
2. System checks `user_role_assignments` table
3. Finds role: `dressing_room_admin`
4. Redirects to `/admin/dressing-room-dashboard`
5. Access to other admin sections blocked by RLS policies

---

## 🧪 Testing

### Test Login
```bash
1. Go to http://localhost:5173/login
2. Email: dress@gmail.com
3. Password: pin832295
4. Click Sign In
5. Should redirect to: /admin/dressing-room-dashboard
```

### Test Access Control
```bash
# Try to access main dashboard
1. Go to http://localhost:5173/admin/dashboard
2. Should redirect back to dressing-room-dashboard

# Try to access other sections
1. Go to http://localhost:5173/admin/cashier-dashboard
2. Should show access denied or redirect
```

### Database Verification
```sql
-- Check role assignment
SELECT * FROM user_role_assignments 
WHERE role_name = 'dressing_room_admin';

-- Check user
SELECT id, email FROM auth.users 
WHERE email = 'dress@gmail.com';

-- Check both
SELECT ura.role_name, au.email, au.id
FROM user_role_assignments ura
JOIN auth.users au ON ura.user_id = au.id
WHERE au.email = 'dress@gmail.com';
```

---

## 📝 Future Implementation

Once this is working, similar setups can be created for:

1. **Ticket Admin** (ticket@gmail.com)
   - Role: `ticket_admin`
   - Access: Ticket booking management only

2. **Retail Admin** (retail@gmail.com)
   - Role: `retail_admin`
   - Access: Product & inventory management only

---

## ⚠️ Important Notes

1. **Password Security:** Change password after initial setup
   ```bash
   # Supabase Dashboard → Authentication → Users → dress@gmail.com → Reset Password
   ```

2. **Email Verification:** Account auto-verified (no confirmation needed)

3. **RLS Policies:** Make sure backend RLS policies check for `dressing_room_admin` role

4. **Audit Logging:** All actions will be logged once audit system is implemented

---

## 📞 Troubleshooting

### User Can't Login
```bash
# Check if user exists
supabase db query "SELECT * FROM auth.users WHERE email = 'dress@gmail.com'"

# Check role assignment
supabase db query "SELECT * FROM user_role_assignments WHERE role_name = 'dressing_room_admin'"
```

### User Can Access Other Dashboards
```bash
# Make sure Login.tsx has the role routing logic
# Make sure adminRoutes has all the routes
# Check RLS policies on sensitive tables
```

### User Sees Blank Page
```bash
# Check browser console for errors
# Make sure DressingRoomDashboard.tsx is created
# Make sure route is added to adminRoutes.ts
```

---

## 🎯 Next Steps

1. ✅ Run: `npx ts-node scripts/create-dressing-room-admin.mts`
2. ✅ Run: `npm run supabase:db:push`
3. ✅ Create DressingRoomDashboard component (copy code above)
4. ✅ Add route to adminRoutes.ts
5. ✅ Test login
6. ✅ Verify access control
7. ✅ Update audit logging (when implemented)
8. Create similar setups for other divisions
