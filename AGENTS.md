# Spark Stage Repo Memory

## Purpose

Spark Stage is a fullstack booking ticket and commerce app.

- Frontend: Vite + React + TypeScript in `frontend/`
- Backend: Supabase Postgres + Edge Functions in `supabase/`
- Payments: DOKU for tickets and product orders

## Repo Map

- `frontend/src/pages/`: route-level pages
- `frontend/src/components/`: shared UI and admin UI
- `frontend/src/hooks/`: data-fetching and domain hooks (includes `useShipping.ts` with localStorage cache)
- `frontend/src/lib/`: Supabase, query client, shared helpers
- `supabase/migrations/`: database schema, RPC, RLS
- `supabase/functions/`: server-side workflows and payment handlers
- `supabase/functions/_shared/`: shared payment and infra helpers
- `supabase/functions/rajaongkir/`: RajaOngkir Enterprise API proxy (provinces, cities, districts, shipping cost)
- `docs/architecture.md`: current architecture and risk zones
- `docs/runbooks/`: operational runbooks
- `docs/decisions/`: stable feature decisions and constraints

## Source Of Truth

- App structure and module map: `docs/architecture.md`
- DB change workflow: `docs/runbooks/db-migrations.md`
- DOKU payment flow: `docs/runbooks/doku-payments.md`
- WhatsApp invoice notifications: `docs/runbooks/WHATSAPP_README.md`
- Voucher behavior: `docs/decisions/voucher-system.md`
- ImageKit migration status: `docs/runbooks/imagekit-migration.md`
- Product admin data-entry rules: `docs/runbooks/admin-product-entry.md`
- Kasir (Cashier) role setup: `docs/runbooks/kasir-setup.md`
- Stock Opname system (NEW 2026-06-09): `docs/runbooks/stock-opname-system.md`
- Stock Opname quick start: `docs/runbooks/STOCK_OPNAME_QUICKSTART.md`
- R2 Migration (ImageKit → Cloudflare R2): `docs/runbooks/r2-migration.md`
- R2 Egress Setup (Zero cost setup): `docs/runbooks/R2_EGRESS_SETUP.md`
- R2 Migration Quick Start: `docs/runbooks/R2_MIGRATION_QUICKSTART.md`
- R2 Migration Status (UPDATED 2026-06-10): **95% COMPLETE - Upload Code Ready** ✅
  - **DONE:** Product images uploaded: 2,227 / 2,227 (100%) ✅
  - **DONE:** R2 bucket: sparkstage-public-assets ✅
  - **DONE:** Custom domain: `cdn.sparkstage55.com` (active, zero-cost egress) ✅
  - **DONE:** DNS: Cloudflare nameservers (hope.ns.cloudflare.com, simon.ns.cloudflare.com) ✅
  - **DONE:** Database cutover: All URLs updated to cdn.sparkstage55.com ✅
  - **DONE:** Website verified: Images loading correctly ✅
  - **READY:** Upload code: R2 Edge Function + Frontend helper written ✅
  - **PENDING:** Deployment: Needs 30-45 minutes to deploy upload code ⏸️
  - Migration guide: `R2_MIGRATION_COMPLETE_SUMMARY.md` ✅
  - Deployment guide: `R2_UPLOAD_DEPLOYMENT_GUIDE.md` ✅
  - Rollback scripts: Available for instant revert if needed ✅
  - **Cost savings:** Rp 504K - 2.3M per year (84-96% reduction) 💰
  - **Next Step:** Deploy upload code when ready (see deployment guide)
- Stock Opname implementation: `STOCK_OPNAME_IMPLEMENTATION_SUMMARY.md`
- Stock Opname deployment guide: `READY_TO_DEPLOY.md`
- Stock Opname finalize workflow: `docs/runbooks/STOCK_OPNAME_FINALIZE.md`
- Stock Opname realtime auto-refresh (NEW 2026-06-09): `docs/runbooks/STOCK_REALTIME_AUTO_REFRESH.md`
- **RajaOngkir Shipping Integration (NEW 2026-06-09):**
  - Overall status: `RAJAONGKIR_INTEGRATION_STATUS.md`
  - On-demand loading: `SHIPPING-ON-DEMAND.md`
  - Rate limit fixes: `RATE-LIMIT-FIX.md`
  - LocalStorage cache: `LOCALSTORAGE_CACHE_IMPLEMENTATION.md`
  - Testing guide: `CACHE_TESTING_GUIDE.md`
- **RajaOngkir shipping integration (NEW 2026-06-09)**: `RAJAONGKIR_INTEGRATION_STATUS.md`
- **RajaOngkir cache implementation**: `LOCALSTORAGE_CACHE_IMPLEMENTATION.md`
- **Shipping on-demand loading**: `SHIPPING-ON-DEMAND.md`
- **Rate limiting fixes**: `RATE-LIMIT-FIX.md`
- **E-Commerce Shipping Integration (NEW 2026-06-10):**
  - Phase 1 Complete: `SHIPPING_PHASE1_COMPLETE.md`
  - Full roadmap: `SHIPPING_INTEGRATION_COMPLETE.md`

## Frontend Stock Management Pages (100% COMPLETE ✅)

All three stock management pages are fully implemented, tested, and ready to deploy with **Complete CRUD Operations** and **✨ Realtime Auto-Refresh**:

- **Stock Opening** (`/admin/stock-opening`): Morning opening stock entry
  - Main list page with create modal + NEW Detail page
  - Product selector with ALL products, multi-field search (name, variant, SKU)
  - Scrollable modal with proper flexbox layout
  - Auto-numbering: #open-00001, #open-00002, etc.
  - Status workflow: draft → confirmed
  - ✅ **Create** - with date, location, items
  - ✅ **Read** - list view and detail page
  - ✅ **Edit** (draft only) - updates date, location, items
  - ✅ **Delete** - with protection if used in opname
  - ✅ **Confirm** - locks opening for use in opname
  - ✨ **Realtime** - auto-refresh on any create/edit/delete/confirm

- **Stock Adjustments** (`/admin/stock-adjustments`): Manual stock changes (gift, KOL, loss, gain)
  - Main list page with create modal + NEW Detail page with summary
  - Type selector: gift (🎁), kol (📢), loss (📉), gain (📈), other (🔧)
  - Mandatory reason field (min 10 chars)
  - Auto-updates product_variants.stock immediately
  - Visual warnings for stock reduction
  - Scrollable modal with proper flexbox layout
  - Auto-numbering: #adj-00001, #adj-00002, etc.
  - ✅ **Create** - with type, reason, items
  - ✅ **Read** - list view and NEW detail page
  - ✅ **Edit** - reverts old stock + applies new stock (smart recalculation)
  - ✅ **Delete** - reverts all stock changes automatically
  - ✨ **Realtime** - auto-refresh on any create/edit/delete

- **Stock Opname** (`/admin/stock-opname`): Physical count vs system stock comparison
  - Main list page with create modal + Detail page showing variance analysis
  - Auto-loads system stock calculation on date/location selection
  - Formula: System Stock = Opening - Sold + Adjustments
  - Variance = Physical Count - System Stock
  - Requires reason if variance != 0 (min 10 chars)
  - Detailed error messages with checklist for requirements
  - Scrollable modal with proper flexbox layout
  - Auto-numbering: #opname-00001, #opname-00002, etc.
  - Status workflow: draft → finalized
  - ✅ **Create** - with date, location, physical counts
  - ✅ **Read** - list view and detail page with variance
  - ✅ **Delete** - removes opname and all items
  - ✅ **Finalize** - locks opname and reconciles stock based on variance
  - ❌ **No Edit** (by design - opname is final audit record)
  - ✨ **Realtime** - auto-refresh on any create/delete/finalize

All pages visible in admin menu under "Toko" > "Inventaris" section for admin and dressing-room-admin roles.

**✨ NEW: Realtime Auto-Refresh:**
- Uses Supabase Realtime with PostgreSQL replication
- Auto-refresh on INSERT, UPDATE, DELETE events
- Multi-user sync - all admins see changes instantly
- No manual refresh needed (no more F5!)
- See `docs/runbooks/STOCK_REALTIME_AUTO_REFRESH.md` for details

**UI Improvements:**
- ✅ Professional custom confirmation dialogs (replaced browser alerts)
- ✅ Proper loading states with icons
- ✅ Visual feedback for all actions
- ✅ Tooltips and helpful messages
- ✅ Responsive design

**Deployment:** 
1. Run `npm run supabase:db:push` to deploy 7 migration files:
   - 5 migrations for CRUD operations (create, update, delete, confirm, finalize)
   - 1 migration for finalize stock opname function
   - 1 migration for enabling realtime on stock tables
2. Run `npm run build` to verify build (✅ PASSED)
3. Test locally with `npm run dev`
4. Deploy to production

**Status:** ✅ Production ready with full CRUD operations + Realtime auto-refresh. See `STOCK_EDIT_DELETE_COMPLETE.md` for complete feature documentation.

## Core Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run supabase:db:push
npm run supabase:functions:serve
```

## Guardrails

- Run all commands from the repo root.
- Treat `supabase/migrations/` as the database source of truth.
- Do not change production schema or RLS manually without a migration file.
- Keep payment side-effects idempotent across webhook, sync, and reconciliation flows.
- Keep docs compact. Update an existing doc before adding a new one.

## Risk Zones

- Ticket payment flow: `create-doku-ticket-checkout`, `doku-webhook`, `sync-doku-ticket-status`
- Product payment flow: `create-doku-product-checkout`, `sync-doku-product-status`
- Shared payment logic: `supabase/functions/_shared/payment-effects.ts`
- WhatsApp invoice sending: `supabase/functions/send-whatsapp-invoice`, `supabase/functions/_shared/fonnte.ts`
- Session and auth timing: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/hooks/useSessionRefresh.ts`
- Large route map: `frontend/src/App.tsx`
- Role-based routing: `frontend/src/pages/Login.tsx` (kasir vs admin dashboard)

## Auth & Roles

Current roles: `admin`, `super_admin`, `starguide`, `kasir`
- **Admin**: Full access to all admin features
- **StarGuide**: Ticket scanning only (entrance management)
- **Kasir**: Sales dashboard + product QR scanning (read-only)

Role assignment: `user_role_assignments` table, managed via `frontend/src/auth/adminRole.ts`

## E-Commerce Retail Product Management (NEW 2026-06-11)

**Migration:** Products from `products` + `product_variants` → `product_retail`
- Status: ✅ Complete (784 products migrated)
- Migration file: `20260611010000_smart_migrate_products_to_retail.sql`
- Documentation: `RETAIL_PRODUCT_MIGRATION_SUMMARY.md`

**Admin Filters (NEW 2026-06-11):** `/admin/retail-products`
- ✅ Active/Inactive status filter
- ✅ No Category filter (finds products without `retail_category_id`)
- ✅ Real-time stats summary (Total, Active, Inactive, No Category)
- ✅ Visual badges on product cards for status and missing category
- Documentation: `RETAIL_PRODUCT_FILTERS_FEATURE.md`

**Retail Categories RLS (NEW 2026-06-12):** `retail_categories` table
- Status: ✅ RLS Enabled and Configured
- Migration file: `20260612000000_create_retail_categories_with_rls.sql`
- Documentation: `docs/runbooks/retail-categories-rls.md`
- **Access Control:**
  - Public/Anonymous: View active categories only
  - Admin roles: Full CRUD access to all categories
  - Non-admin authenticated: View active categories only
- **Departments:** `glam`, `charmbar`, `sparkclub`
- **Features:** Hierarchical (parent_id), slug-based URLs, soft delete (is_active)

**Common Admin Tasks:**
- Find products needing categories: Filter by "No Category"
- Review disabled products: Filter by "Inactive"
- Data quality check: Combine filters (e.g., Active + No Category)

## Custom Skills

### SparkStage US Builder (NEW 2026-06-13)
- **Location:** `.agents/skills/sparkstage-us-builder/`
- **Purpose:** Expert agent for building US market version with Stripe/PayPal/Square replacing DOKU payments
- **Quick Start:** `QUICKSTART_ID.md` (Bahasa Indonesia guide)
- **Use Cases:**
  - Migrate DOKU payments to Stripe
  - Integrate US shipping providers (USPS/FedEx/UPS via EasyPost)
  - Convert IDR to USD currency
  - Update i18n from Indonesian to English
  - Create Stripe webhook handlers
- **Activation:** Say "Help me build US version of SparkStage" or "Migrate DOKU to Stripe"
- **Documentation:**
  - `SKILL.md` - Complete agent knowledge base
  - `MIGRATION_COMPARISON.md` - DOKU vs Stripe detailed comparison
  - `DEPLOYMENT_GUIDE.md` - Production deployment steps
  - `TESTING_STRATEGY.md` - Testing workflow
  - `us-dependencies.json` - All required dependencies
- **Summary:** `SPARKSTAGE_US_SETUP_COMPLETE.md` at repo root

## Working Rules

- Prefer TanStack Query patterns already used in the app.
- Put long-lived decisions in `docs/decisions/`.
- Put operational or recovery steps in `docs/runbooks/`.
- Delete stale planning docs after their final state is absorbed into active docs.
