# WhatsApp Integration for Ticket Confirmations

## Overview

This implementation integrates DOKU's WhatsApp Message Service to send automated ticket confirmation messages to customers after successful payment.

### Flow

1. **Checkout Created** → Customer provides phone number during ticket purchase
2. **Payment Completed** → Webhook triggers ticket issuance
3. **Notifications Sent** → WhatsApp confirmation message sent via DOKU API
4. **Loyalty Points Awarded** → Points awarded for the purchase

## Setup Instructions

### 1. Add Environment Variables to Supabase

Go to your **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Environment variables**

Add these 3 variables:

```
DOKU_WHATSAPP_ENABLED=true
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-XXXXXX-XXXXX
DOKU_IS_PRODUCTION=true
```

**Note:** 
- `DOKU_CLIENT_ID` dan `DOKU_SECRET_KEY` sudah ada (reuse dari payment integration)
- **`DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID` akan didapat dari langkah 2 & 3 di bawah**

### 2. Login ke DOKU Dashboard

Buka: https://dashboard.doku.com

Login dengan akun Anda (sama yang digunakan untuk payment integration).

### 3. Navigate ke WhatsApp Templates

**Di Dashboard:**
1. Klik **Settings** (gear icon di sidebar)
2. Pilih **WhatsApp** atau **Message Templates**
3. Klik **Create New Template**

### 4. Isi Informasi Template

**Form yang akan muncul:**

```
Template Name: Ticket Confirmation
Category: Marketing (atau Transactional)
Language: Indonesian
```

Setelah isi form di atas, klik **Next** atau **Continue**.

### 5. Copy-Paste Template Body Exactly

Di halaman berikutnya, akan ada field **Template Body** atau **Message Content**.

**Copy dan paste EXACTLY ini:**

```
Hi {{1}}! 🫶

Booking kamu di SPARK STAGE 55 berhasil 🫶

🎟️ Invoice: {{2}}
📅 Tanggal: {{3}}
⏰ Jam: {{4}}
👥 Jumlah tiket: {{5}} pax

📍 Lokasi:
{{6}}

Mohon datang 15 menit sebelum sesi dimulai.

See you, STAR ✨
```

**Penting:** Jangan ubah `{{1}}`, `{{2}}`, dst. - itu adalah placeholder yang nanti akan diganti otomatis oleh system.

### 6. Klik Submit/Create Template

Setelah submit, DOKU akan:
- Validate template
- Assign unique **Template ID**
- Return Template ID (format: `TMP-240223-07652`)

**Template ID yang muncul itulah nilai untuk `DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID`**

### 7. Copy Template ID ke Supabase

```
Contoh Template ID dari DOKU: TMP-240223-07652

Di Supabase, set:
DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID=TMP-240223-07652
```

### 8. Template Parameters Explanation

Setiap `{{number}}` dalam template akan diisi otomatis oleh system saat sending WhatsApp:

| Parameter | Source Data | Contoh Nilai |
|-----------|-------------|--------------|
| `{{1}}` | `customer_name` dari orders table | John Doe |
| `{{2}}` | `ticket_code` dari purchased_tickets table | TKT-ABC12345-Z1ABC |
| `{{3}}` | `selected_date` dari order_items + format ID | 15 Mei 2026 |
| `{{4}}` | `selected_time_slots` dari order_items | 19:00 |
| `{{5}}` | Total `quantity` semua order_items | 2 |
| `{{6}}` | Hardcoded venue name | SPARK STAGE 55 |

**Contoh hasil pesan yang dikirim ke customer:**

```
Hi John Doe! 🫶

Booking kamu di SPARK STAGE 55 berhasil 🫶

🎟️ Invoice: TKT-ABC12345-Z1ABC
📅 Tanggal: 15 Mei 2026
⏰ Jam: 19:00
👥 Jumlah tiket: 2 pax

📍 Lokasi:
SPARK STAGE 55

Mohon datang 15 menit sebelum sesi dimulai.

See you, STAR ✨
```

### 9. Verify Phone Number Format

The system automatically normalizes phone numbers:
- Accepts: `+62821234567`, `0821234567`, `62821234567`
- Converts Indonesian numbers: `0821234567` → `62821234567`
- Country code 62 is added automatically for 0-prefixed numbers

## API Reference

### WhatsApp Module (`_shared/whatsapp.ts`)

#### `sendWhatsAppMessage(params)`

Sends a WhatsApp message via DOKU API.

**Parameters:**
- `clientId` (string) - DOKU Client ID
- `secretKey` (string) - DOKU Secret Key
- `isProduction` (boolean) - Use production or sandbox endpoint
- `templateId` (string) - WhatsApp template ID
- `destinationPhone` (string) - Recipient phone number
- `params` (string[]) - Template parameter values

**Returns:**
```typescript
{
  success: boolean
  messageId?: string  // DOKU message ID
  error?: string      // Error message if failed
  details?: Record<string, unknown>  // Additional error details
}
```

**Example:**
```typescript
import { sendWhatsAppMessage } from '../_shared/whatsapp.ts'

const result = await sendWhatsAppMessage({
  clientId: 'YOUR_CLIENT_ID',
  secretKey: 'YOUR_SECRET_KEY',
  isProduction: true,
  templateId: 'TMP-240223-07652',  // dari DOKU WhatsApp Templates
  destinationPhone: '+62821234567',
  params: ['John Doe', 'TKT-ABC12345-Z1ABC', '15 Mei 2026', '19:00', '2', 'SPARK STAGE 55']
})

if (result.success) {
  console.log('Message sent:', result.messageId)
} else {
  console.error('Send failed:', result.error)
}
```

#### `buildTicketConfirmationParams(params)`

Helper function to build template parameters in the correct order.

**Parameters:**
- `customerName` (string) - Nama customer
- `invoiceNumber` (string) - Ticket code format (TKT-...)
- `bookingDate` (string) - Format: "DD Bulan YYYY" (e.g., "15 Mei 2026")
- `sessionTime` (string) - Format: "HH:MM" (e.g., "19:00")
- `ticketCount` (number) - Jumlah tiket
- `venueName` (string) - Nama venue

**Example:**
```typescript
import { buildTicketConfirmationParams } from '../_shared/whatsapp.ts'

const params = buildTicketConfirmationParams({
  customerName: 'John Doe',
  invoiceNumber: 'TKT-ABC12345-Z1ABC',  // Ticket code, not order number
  bookingDate: '15 Mei 2026',
  sessionTime: '19:00',
  ticketCount: 2,
  venueName: 'SPARK STAGE 55'
})
// Returns: ['John Doe', 'TKT-ABC12345-Z1ABC', '15 Mei 2026', '19:00', '2', 'SPARK STAGE 55']
```

## Implementation Details

### Payment Effects Integration

The WhatsApp notification is triggered automatically when a ticket order status transitions to `paid`:

**Location:** `_shared/payment-effects.ts` → `sendTicketNotificationsIfNeeded()`

**When it triggers:**
- After successful payment and ticket issuance
- Only if customer provided a phone number during checkout
- Only if WhatsApp is enabled in environment

**What happens:**
1. Fetches order details (name, phone, email)
2. Retrieves booking dates and time slots
3. Sends WhatsApp confirmation message via DOKU API
4. Logs success/failure in webhook_logs table
5. Awards loyalty points

**Side Effects:**
- Creates entry in `webhook_logs` table if WhatsApp send fails
- Continues with other notifications if WhatsApp send fails (non-blocking)
- Returns status in notification result

### Idempotency & Safety

- Uses DOKU's payment effect run system to prevent duplicate sends
- Wrapped in `withPaymentEffectRun()` which claims/tracks effect execution
- Non-blocking errors: WhatsApp failure doesn't prevent loyalty points
- All errors are logged to database for monitoring

### Error Handling

**Scenario: Network failure**
- Logged to `webhook_logs` as `whatsapp_notification_exception`
- Order payment still succeeds
- Customer can still use tickets
- Retry manually via dashboard

**Scenario: Invalid template ID**
- DOKU returns error with code (e.g., `invalid_template`)
- Logged to `webhook_logs` as `whatsapp_notification_failed`
- Error details saved for debugging

**Scenario: Invalid phone number**
- Normalized automatically when possible
- If normalization fails, error is logged
- Suggest customer provide number in `+62...` format

## Monitoring & Troubleshooting

### Check WhatsApp Send Status

Query the webhook logs:
```sql
SELECT 
  order_number,
  event_type,
  payload,
  success,
  error_message,
  processed_at
FROM webhook_logs
WHERE event_type LIKE 'whatsapp_%'
ORDER BY processed_at DESC
LIMIT 100;
```

### Verify Template ID

Check that `DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID` matches the template created in DOKU dashboard:
- Dashboard: Settings → WhatsApp Templates
- Note: Template IDs are unique per merchant account

### Test Phone Number

Use a test phone number in development:
- Add to DOKU sandbox WhatsApp whitelist
- Verify it receives test messages
- Check phone number format: `+62...` or `0...` both work

### Debug Signature Errors

If receiving `invalid_signature` error:
1. Verify `DOKU_SECRET_KEY` matches dashboard
2. Check timestamp isn't too old (use server time)
3. Verify request target path is correct
4. Check JSON body is valid

## Rate Limits

- **100 requests per minute** (per DOKU limits)
- Multiple messages to different numbers allowed
- Bulk message sending: spread across multiple requests

## Migration Plan

### Phase 1: Sandbox Testing
- Set `DOKU_IS_PRODUCTION=false`
- Test with whitelisted test numbers
- Verify template rendering
- Check error handling

### Phase 2: Soft Launch
- Set `DOKU_IS_PRODUCTION=true`
- Enable for subset of customers (10-20%)
- Monitor webhook_logs for errors
- Gather feedback

### Phase 3: Full Rollout
- Enable for all customers
- Set `DOKU_WHATSAPP_ENABLED=true`
- Update customer communication
- Monitor delivery rates

## Disable / Rollback

To disable WhatsApp notifications without code changes:

```bash
# Set in Supabase environment
DOKU_WHATSAPP_ENABLED=false
```

This gracefully disables WhatsApp sends while keeping code intact.

## Cost Considerations

- WhatsApp messages cost determined by DOKU's pricing
- Check DOKU dashboard for message costs per template
- Typical cost: $0.05-0.10 per message for business messages
- Optimize: Only send to customers who opted-in for notifications

## Related Documentation

- [DOKU Payment Integration](./docs/runbooks/doku-payments.md)
- [Payment Flow Architecture](./docs/architecture.md)
- [Database Schema - Orders & Order Items](./supabase/migrations/20260206000000_baseline.sql)
