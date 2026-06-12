# Fixing Localhost Issue in Notifications

## Problem

Notifications in my-tickets page (especially WhatsApp notifications) may still be using `localhost` URLs in production, instead of the actual production domain.

**Symptoms:**
- ❌ Cancel order fails with 500 error
- ❌ WhatsApp notifications include localhost URLs in callback links
- ❌ DOKU payment endpoints reject localhost in production mode

## Root Cause

The `PUBLIC_APP_URL` environment variable in Supabase is still set to `http://localhost:5173` instead of your production domain.

## Solution

### Step 1: Check Current Configuration

```bash
node scripts/validate-app-url.js
```

This will show:
- Current app URLs in environment files
- Whether they're localhost or production
- What needs to be fixed

### Step 2: Check Notification Configuration

```bash
node scripts/check-notification-config.js
```

This provides:
- Detailed checklist of what environment variables are needed
- Step-by-step fix instructions
- Common issues and solutions

### Step 3: Update Supabase Environment Variables

Go to **Supabase Dashboard**:

1. Select your project
2. Go to **Settings → Environment**
3. Update these variables:

```
PUBLIC_APP_URL=https://your-production-domain.com
SITE_URL=https://your-production-domain.com
```

**Important:**
- Use HTTPS (required for DOKU payment gateway)
- Must not be localhost in production
- Should match your actual app domain

### Step 4: Verify DOKU Configuration

Ensure these are also set in Supabase Environment:

```
DOKU_WHATSAPP_PRODUCTION=true      # For live, false for sandbox
DOKU_WHATSAPP_CLIENT_ID=<your_id>
DOKU_WHATSAPP_SECRET_KEY=<your_key>
```

### Step 5: Redeploy Functions

**Local development:**
```bash
npm run supabase:functions:serve
```

**Production:**
- Redeploy edge functions
- Or wait for cache refresh (can take a few minutes)

## Verification

After making changes:

1. **Test cancel order:**
   - Go to my-tickets
   - Find a pending order
   - Click cancel button
   - Should work without 500 error

2. **Check WhatsApp notification:**
   - Look at WhatsApp message
   - URLs should point to your production domain
   - NOT localhost

3. **Check function logs:**
   - Supabase Dashboard → Functions → cancel-ticket-order
   - Look for `[sendTicketNotifications]` logs
   - Verify PUBLIC_APP_URL is correct

## Key Files Involved

- `supabase/functions/_shared/env.ts` - Reads PUBLIC_APP_URL
- `supabase/functions/_shared/payment-effects.ts` - Uses URL in notifications
- `frontend/src/pages/my-tickets/useMyTicketsView.ts` - Cancel order logic

## Environment Variables Precedence

The code checks these in order (first found is used):

1. `PUBLIC_APP_URL` (Supabase)
2. `APP_URL` (Supabase)
3. `SITE_URL` (Supabase)
4. `VITE_PUBLIC_APP_URL` (Frontend)
5. `VITE_APP_URL` (Frontend)

**Set `PUBLIC_APP_URL`** - it's the main one.

## Troubleshooting

### Issue: DOKU Checkout fails with "localhost" error

**Cause:** `PUBLIC_APP_URL` still localhost + DOKU production mode

**Fix:**
1. Set correct production domain in PUBLIC_APP_URL
2. Or use DOKU sandbox mode if not ready for production

### Issue: WhatsApp notifications don't send

**Cause:** DOKU WhatsApp credentials not configured

**Fix:**
1. Verify `DOKU_WHATSAPP_CLIENT_ID` is set
2. Verify `DOKU_WHATSAPP_SECRET_KEY` is set
3. Check `DOKU_WHATSAPP_PRODUCTION` matches your environment

### Issue: Cancel order still returns 500

**Steps to debug:**
1. Check Supabase function logs
2. Run: `node scripts/check-notification-config.js`
3. Verify `PUBLIC_APP_URL` is actually saved in Supabase
4. Check: Did functions/migrations apply successfully?

## Additional Resources

- See [WHATSAPP_README.md](../runbooks/WHATSAPP_README.md) for WhatsApp setup details
- See [doku-payments.md](../runbooks/doku-payments.md) for DOKU payment configuration
