# Admin Menu Cleanup - US Version

**Date:** 2026-06-13  
**Status:** ✅ Complete

## Overview
Removed all booking and ticket-related menu items from admin sidebar to align with US version being **e-commerce only** (no event ticketing).

## Changes Made

### 1. Removed STARGUIDE_MENU_SECTIONS
- **Entire section deleted** - StarGuide role is for ticket scanning only
- Removed items:
  - Event Bookings
  - Scan Tiket Masuk
  - Scan QR Tablet
  - Log Tiket Masuk
  - Laporan Kaos Kaki (sock report)

### 2. Removed Tickets Section from ADMIN_MENU_SECTIONS
- **Entire "Tiket" section deleted** from main admin menu
- Removed items:
  - Booking Page Config
  - Entrance Booking Manager
  - Event Bookings
  - Scan Tiket Masuk
  - Scan QR Tablet
  - Log Tiket Masuk

### 3. Removed Event Page Config
- Removed from Management section
- Event page is ticket-booking related

## What Remains (E-Commerce Features)

### Admin Dashboard (`/admin/dashboard`)
- Main entry point for all admin users

### Management Section
- Kelola Stage
- Kelola QR Massal
- Analitik Stage
- Laporan Penjualan
- Kelola Banner
- News Page Config
- Charm Bar Config
- Venue Reviews
- Kelola Poin Loyalty
- Audit Logs
- Kelola Divisi

### Store Section (Toko)
- **Product Orders** - Customer orders management
- **Scan Pickup Produk** - QR code scanning for product pickup
- **Voucher & Diskon** - Discount management
- **Stok & Produk** - Inventory management
- **Stock Opening** - Morning stock entry
- **Stock Adjustments** - Manual stock changes
- **Stock Opname** - Physical count audits
- **Produk Retail (E-Com)** - E-commerce product catalog

### Dressing Room Section
- Dashboard Dressing
- Inventory & Stok
- Produk Dressing Room
- Dressing Room Manager
- Sewa Dressing Room
- Scan QR Rental Pickup

### GLAM Section
- GLAM Page Config

### Cashier Menu (CASHIER_MENU_SECTIONS)
- Sales Back Office
- Dashboard Penjualan
- Cek Pesanan
- Scan QR Produk
- Laporan Penjualan

### Owner Menu (OWNER_MENU_SECTIONS)
- Sales Back Office
- Stock Opening
- Stock Adjustments
- Stock Opname
- Laporan Penjualan

### Dressing Room Admin Menu (DRESSING_ROOM_ADMIN_MENU_SECTIONS)
- All store and dressing room features (unchanged)

## Files Modified
- `frontend/src/constants/adminMenu.ts` - Removed booking/ticket sections

## Related Changes
- Public navbar: Booking link already removed (see previous task)
- Admin login: Working correctly with role-based redirection

## Testing
1. Login as admin: `admin@test.com` / `password123`
2. Verify admin sidebar shows only e-commerce sections
3. No "Tiket" menu section should appear
4. No "Event Page Config" in Management section

## Next Steps
The admin menu is now clean and focused on e-commerce operations. Future Stripe integration will add:
- Payment settings in Management section
- Stripe webhook logs in Audit section
- US shipping provider configs in Store section
