# DOKU Payments Runbook

## Scope

This runbook covers ticket payments, product payments, webhook handling, manual
sync, and reconciliation. The active provider is DOKU Checkout.

## Main Components

### Frontend

- `frontend/src/pages/PaymentPage.tsx`
- `frontend/src/pages/BookingSuccessPage.tsx`
- `frontend/src/pages/ProductCheckoutPage.tsx`
- `frontend/src/pages/ProductOrderSuccessPage.tsx`
- `frontend/src/pages/ProductOrderPendingPage.tsx`

### Edge Functions

- `supabase/functions/create-doku-ticket-checkout/`
- `supabase/functions/create-doku-product-checkout/`
- `supabase/functions/create-cashier-product-order/`
- `supabase/functions/doku-webhook/`
- `supabase/functions/sync-doku-ticket-status/`
- `supabase/functions/sync-doku-product-status/`
- `supabase/functions/reconcile-doku-payments/`
- shared side-effects in `supabase/functions/_shared/payment-effects.ts`

## Env Ownership

### Frontend Hosting Env

Set these in Vercel or another frontend host:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`
- `VITE_DOKU_IS_PRODUCTION`

What they do:

- `VITE_APP_URL` is the app origin used by frontend pages and QR-related links.
- `VITE_DOKU_IS_PRODUCTION` is an internal repo flag only. `true` loads
  `https://jokul.doku.com/...`; `false` loads `https://sandbox.doku.com/...`.

### Supabase Edge Function Secrets

Set these in Supabase secrets:

- `DOKU_CLIENT_ID`
- `DOKU_SECRET_KEY`
- `DOKU_IS_PRODUCTION`
- `DOKU_PAYMENT_METHOD_TYPES`
- `PUBLIC_APP_URL`
- `APP_ALLOWED_ORIGINS`

What they do:

- `DOKU_CLIENT_ID` and `DOKU_SECRET_KEY` are the DOKU credentials used for
  signed backend requests.
- `DOKU_IS_PRODUCTION` is an internal repo flag only. `true` selects
  `https://api.doku.com`; `false` selects `https://api-sandbox.doku.com`.
- `DOKU_PAYMENT_METHOD_TYPES` is a comma-separated checkout whitelist sent as
  `payment.payment_method_types` so launch scope is constrained from payload as
  well as dashboard.
  Example early-live value:
  `VIRTUAL_ACCOUNT_BNI,ONLINE_TO_OFFLINE_INDOMARET,ONLINE_TO_OFFLINE_ALFA,QRIS`
- `PUBLIC_APP_URL` is the canonical app origin used when callback URLs are built
  server-side.
- `APP_ALLOWED_ORIGINS` is a comma-separated allowlist for browser origins that
  may call the payment functions.

### Operator Notes

- `DOKU_IS_PRODUCTION` and `VITE_DOKU_IS_PRODUCTION` are not official DOKU
  parameters. They only control which API base URL and Jokul Checkout JS URL
  this repo selects.
- Never put `DOKU_SECRET_KEY` in frontend hosting env.
- If backend is production while frontend still loads sandbox JS, checkout will
  be misconfigured. Treat both production flags as a pair.
- In production, checkout creators now fail fast when
  `DOKU_PAYMENT_METHOD_TYPES` is empty, `PUBLIC_APP_URL` is non-HTTPS or
  localhost, or the request origin is outside `APP_ALLOWED_ORIGINS`.

## End-To-End Flow

### Ticket Orders

1. Frontend requests a DOKU Checkout session through
   `create-doku-ticket-checkout`.
2. The function creates a pending order and stores DOKU response data including
   `payment_url`.
3. DOKU popup SDK opens with that `payment_url`.
4. `doku-webhook` verifies DOKU signature headers and updates DB state from DOKU
   notifications.
5. `sync-doku-ticket-status` is available as a fallback when status looks stuck.
6. `reconcile-doku-payments` repairs mismatches that slip through or marks truly
   expired orders after local expiry.

### Product Orders

1. Frontend validates voucher preview with `validate_voucher` when needed.
2. `create-doku-product-checkout` reserves stock and voucher quota, then creates
   the order.
3. Webhook or sync finalizes payment state.
4. Paid orders generate pickup data.
5. Failed or expired orders release reserved stock and voucher quota.
6. If webhook or client sync misses a final state after local payment expiry,
   `reconcile-doku-payments` re-queries DOKU and finalizes the order.

### Cashier Product Orders

1. Frontend calls `create-cashier-product-order` to create a cashier reservation
   with a QR pickup code.
2. The order is stored as `channel = 'cashier'` and remains unpaid until admin
   scans the QR.
3. `complete-product-pickup` is the moment that marks the order paid and
   completed for cashier flow.
4. Expired cashier reservations release reserved stock and voucher quota
   automatically.
5. Cashier reservation expiry is enforced by `expire-product-orders`, not by
   DOKU sync.

## Reliability Rules

- Webhook, sync, and reconciliation must reuse the same side-effects logic.
- Webhook, sync, and reconciliation must route ticket and product status changes
  through the shared transition processors.
- Ticket issuance, capacity release, pickup generation, and stock release must
  be idempotent.
- Lower-priority provider states must not overwrite a stronger local terminal
  state. In practice this means `pending` cannot regress `paid`, and `failed` or
  `expired` cannot overwrite a settled order.
- Final status in DB is the source of truth for frontend UI.
- DOKU online payment finality stays webhook-first, with cron-backed
  reconciliation as the fallback.
- App-owned expiry windows such as cashier QR and pickup QR are enforced by a
  frequent cron sweep, not a daily batch.

## Current Hardening Status

- Signature verification is handled with DOKU non-SNAP HMAC request headers on
  webhook and status sync paths.
- Shared transition processors are used across webhook, sync, and reconciliation
  finalization paths.
- Reconciliation exists for mismatch repair.
- Idempotency markers are used for ticket issuance and release flows.
- Product voucher quota release is guarded so duplicate failed or expired
  callbacks do not decrement quota repeatedly.
- Product stock release clamps to remaining reserved stock before releasing, so
  repeated recovery paths do not over-release.
- DOKU checkout creators validate app callback URLs before reserving inventory
  and roll back created rows on checkout creation failures.
- Success pages use realtime plus polling fallback instead of assuming a single
  happy path.
- Cashier QR expiry and pickup QR expiry are enforced by
  `expire-product-orders`.
- Stale online DOKU orders are re-checked by `reconcile-doku-payments`.

## Operator Checklist Before Live Smoke Test

- Confirm `DOKU_CLIENT_ID` and `DOKU_SECRET_KEY` in Supabase are the official
  production credentials.
- Confirm `DOKU_IS_PRODUCTION=true` in Supabase secrets.
- Confirm `VITE_DOKU_IS_PRODUCTION=true` in frontend hosting and redeploy after
  the change.
- Confirm `PUBLIC_APP_URL` in Supabase matches the real production app URL.
- Confirm `VITE_APP_URL` in frontend hosting matches the same production URL.
- Confirm `APP_ALLOWED_ORIGINS` includes the final production origin.
- Confirm DOKU Back Office notification URLs are configured for the payment
  methods you will actually open first.
- Confirm checkout page payment methods are restricted to channels that are
  already active and understood by operations.
- Confirm `DOKU_PAYMENT_METHOD_TYPES` includes `QRIS` when QRIS should be
  visible on DOKU Checkout. Dashboard activation alone is not enough when this
  payload whitelist is set.
- Prefer a live smoke test with a low-value ticket or product before broad
  rollout.

## Operator Checklist For Early-Live Monitoring

Use this during the first 24-72 hours after soft launch.

- Check recent DOKU-backed ticket orders for stuck `pending` status past local
  expiry.
- Check recent DOKU-backed product orders for missing `pickup_code` after
  `paid`.
- Check for `paid` ticket orders without `purchased_tickets`.
- Check `webhook_logs` for steady incoming DOKU notifications and obvious gaps.
- Check reconciliation and expiry cron jobs if stale pending orders accumulate.
- Keep launch scope limited to the payment methods already validated in
  production.

## Cron Jobs

- `reconcile-doku-payments-every-5-minutes`
  - every 5 minutes
  - re-checks stale online ticket and product orders whose local expiry has
    passed
- `expire-product-orders-every-5-minutes`
  - every 5 minutes
  - expires unpaid cashier QR reservations and expired pickup QR codes
- `expire-tickets-daily`
  - 00:05 WIB
  - marks past-date tickets as expired in DB
- `ensure-ticket-availability-daily`
  - 00:15 WIB
  - extends ticket availability coverage
- `retention-cleanup-daily`
  - 01:00 WIB
  - prunes webhook logs and stale reservation tables

## DOKU To App Status Mapping

- `SUCCESS` -> `paid`
- `PENDING`, `TIMEOUT`, `REDIRECT` -> `pending`
- `FAILED` -> `failed`
- `EXPIRED` or `ORDER_EXPIRED` -> `expired`
- `REFUNDED` -> `refunded`
- `ORDER_GENERATED` and `ORDER_RECOVERED` stay `pending`

## Quick Checks For "Paid But UI Still Pending"

- Verify DOKU notification is reaching the webhook endpoint.
- Verify frontend is loading the correct DOKU JS host for the intended
  environment.
- Verify signature calculation is correct for the received payload.
- Check whether the order is already `paid` in the database.
- Check whether ticket issuance or pickup generation is missing.
- Run the sync function if the webhook path looks delayed.
- Check `cron.job` when stale pending orders do not clear after local expiry.

## Cron Audit Query

```sql
select jobname, schedule, command
from cron.job
where jobname in (
  'reconcile-doku-payments-every-5-minutes',
  'expire-product-orders-every-5-minutes',
  'expire-tickets-daily',
  'ensure-ticket-availability-daily',
  'retention-cleanup-daily'
)
order by jobname;
```

## Audit Queries

```sql
select order_number, status, expires_at
from orders
where status = 'pending'
  and expires_at < now()
order by expires_at asc;

select order_number, status, payment_status, payment_expired_at
from order_products
where status not in ('completed', 'cancelled', 'expired')
  and payment_status <> 'paid'
  and payment_expired_at < now()
order by payment_expired_at asc;

select o.order_number
from orders o
left join order_items oi on oi.order_id = o.id
left join purchased_tickets pt on pt.order_item_id = oi.id
where o.status = 'paid'
group by o.order_number
having count(pt.id) = 0;

select order_number
from order_products
where payment_status = 'paid' and pickup_code is null;

select op.order_number, pv.id as variant_id, pv.reserved_stock
from order_products op
join order_product_items opi on opi.order_product_id = op.id
join product_variants pv on pv.id = opi.product_variant_id
where op.status in ('expired', 'cancelled') and pv.reserved_stock > 0;
```

## Non-Blocking Cleanup After Stable Live

- Remove or archive obsolete `midtrans-*` edge functions after the team confirms
  no rollback path is needed.
- Remove obsolete Midtrans secrets after the same confirmation.
- Rotate DOKU credentials if they were ever exposed outside the secret manager.

## Validation

```bash
npm run test
```

Test coverage should focus on DOKU status mapping and payment-related UI
behavior.
