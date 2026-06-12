# WhatsApp Fonnte Testing Guide - Option B (Direct API)

## 🎯 Quick Setup

### Test Data
```
Phone Number: 6285210017968 (or your test number)
Customer Name: Budi Santoso
Order Type: Ticket
```

### Phone Format Support ✅
Fonnte accepts all these formats automatically:
- `08xxxxxxxxxx` (Indonesian, no country code)
- `62xxxxxxxxxx` (Country code 62)
- `+62xxxxxxxxxx` (International format with +)

**System auto-normalizes** all to `62xxxxxxxxx` internally.

---

## 🚀 Option B: Direct API Testing

### Step 1: Get Your Test Credentials
```bash
# Get Supabase Project Reference
echo "Your project ref from: https://app.supabase.com/projects"

# Get Anon Key
echo "From: Supabase Dashboard → Settings → API → anon key"

# Get Fonnte Token
echo "From: https://fonnte.com → Settings → API → Copy token"
```

### Step 2: Prepare Test Variables
```bash
# Set these in PowerShell or export in bash
$PROJECT_REF = "your-project-ref"        # e.g., abcdefghijklmnop
$ANON_KEY = "your-anon-key"              # eyJ0eXAi...
$FONNTE_TOKEN = "your-fonnte-token"      # From fonnte.com
$PHONE = "6285210017968"                 # Customer test phone
$CUSTOMER_NAME = "Budi Santoso"          # Customer name
```

### Step 3: Create Test Ticket Order

**Step 3a: Get available ticket and date**
```bash
curl -X GET "https://$PROJECT_REF.supabase.co/rest/v1/tickets?limit=1" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"
```
Response will include `id` (use as TICKET_ID)

**Step 3b: Create order**
```bash
$TICKET_ID = 1                           # From previous response
$QUANTITY = 2
$SELECTED_DATE = "2026-05-20"            # Format: YYYY-MM-DD
$TIME_SLOT = "19:00"                     # Format: HH:MM

curl -X POST "https://$PROJECT_REF.supabase.co/functions/v1/create-doku-ticket-checkout" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"ticketId\": $TICKET_ID,
    \"quantity\": $QUANTITY,
    \"selectedDate\": \"$SELECTED_DATE\",
    \"selectedTimeSlots\": [\"$TIME_SLOT\"],
    \"customerName\": \"$CUSTOMER_NAME\",
    \"customerPhone\": \"$PHONE\",
    \"customerEmail\": \"budi@example.com\"
  }"
```

Response akan include:
```json
{
  "orderNumber": "TKT-240513-ABC123",
  "checkout_url": "...",
  "status": "pending"
}
```

**Save ORDER_NUMBER untuk step berikutnya**

### Step 4: Simulate Payment Success (Create Order)

Kalau checkout sudah dibayar di DOKU, order otomatis jadi. Kalau mau langsung trigger WhatsApp tanpa payment:

**Option A: Manual - Bayar via DOKU**
1. Buka URL dari `checkout_url` di response step 3b
2. Complete payment di DOKU
3. WhatsApp otomatis dikirim (wait 5-10 seconds)

**Option B: Direct - Trigger WhatsApp tanpa payment**
```bash
$ORDER_NUMBER = "TKT-240513-ABC123"      # From step 3b

curl -X POST "https://$PROJECT_REF.supabase.co/functions/v1/send-whatsapp-invoice" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderNumber\": \"$ORDER_NUMBER\"
  }"
```

Response Success:
```json
{
  "status": "success",
  "message": "WhatsApp invoice sent successfully",
  "orderNumber": "TKT-240513-ABC123",
  "messageId": "fonnte_123456789"
}
```

Response Already Sent:
```json
{
  "status": "skipped",
  "message": "Message already sent previously",
  "orderNumber": "TKT-240513-ABC123"
}
```

**Force resend (skip duplicate check):**
```bash
curl -X POST "https://$PROJECT_REF.supabase.co/functions/v1/send-whatsapp-invoice" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderNumber\": \"$ORDER_NUMBER\",
    \"forceSend\": true
  }"
```

---

## 📝 Expected WhatsApp Message Format

```
Halo Budi Santoso!

Booking kamu berhasil dengan invoice
TKT-240513-ABC123

Tanggal: 20/05/2026
Jam: 19:00
Qty: 2
Venue: SPARK STAGE 55

Terima Kasih! 🎉
```

---

## 🔍 Verify Message Sent

### Check in Database
```sql
-- Check whatsapp_messages table
SELECT 
  order_number,
  customer_phone,
  delivery_status,
  created_at
FROM whatsapp_messages
WHERE order_number = 'TKT-240513-ABC123'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected delivery_status:**
- `submitted` = Message sent to Fonnte successfully
- `delivered` = Message delivered to customer phone
- `failed` = Failed to send

### Check Webhook Logs (if payment was made)
```sql
SELECT 
  event_type,
  order_number,
  error_message,
  processed_at
FROM webhook_logs
WHERE order_number = 'TKT-240513-ABC123'
AND event_type LIKE '%whatsapp%'
ORDER BY processed_at DESC
LIMIT 5;
```

---

## 📋 Payment Form Consistency

### Ticket Payment Page (`PaymentCustomerForm.tsx`)
✅ Already correct:
- Label: "WhatsApp Number *Untuk Reminder"
- Placeholder: "08xxxxxxxxxx atau +62xxxxxxxxx"
- Help text: "Format: 08xxxxxxxxxx, +62xxxxxxxxx, atau 62xxxxxxxxx..."
- Message: "Kami akan mengirim reminder ke WhatsApp ini..."

### Product Checkout Form (`CheckoutCustomerForm.tsx`)
✅ Already correct:
- Label: "Phone Number (For WhatsApp Confirmation)"
- Placeholder: "+628xxxxxxxxxx atau 628xxxxxxxxxx atau 08xxxxxxxxxx"
- Help text: "Format: +628..., 628..., atau 08..." 
- Message: "WhatsApp akan dikirim otomatis setelah pembayaran berhasil"

**Forms sudah konsisten dengan Fonnte format!** ✅

---

## 🧪 Complete Test Flow (Manual Recommended)

### Flow A: Full End-to-End (Recommended)
1. Open app → Booking page
2. Select ticket + date + time
3. Input name: `Budi Santoso`
4. Input phone: `6285210017968` (or your test phone)
5. Click "Continue to Payment"
6. Complete DOKU payment
7. ✅ WhatsApp otomatis terkirim dalam 5-10 seconds
8. Verify: Check phone atau database

### Flow B: API Direct (Faster)
1. Create order via `create-doku-ticket-checkout` (Step 3b)
2. Save `orderNumber`
3. Trigger WhatsApp: `send-whatsapp-invoice` (Step 4B)
4. ✅ Message sent immediately
5. Verify: Check phone atau database

---

## 🐛 Troubleshooting

### WhatsApp tidak terkirim
```sql
-- Check status di database
SELECT * FROM whatsapp_messages 
WHERE order_number = 'TKT-240513-ABC123'
ORDER BY created_at DESC LIMIT 1;

-- Check if Fonnte token is valid
-- Go to https://fonnte.com → Dashboard → check account status
```

### Message sent tapi tidak diterima
- Phone number format invalid? Try: `+6285210017968`
- Fonnte token expired? Regenerate di https://fonnte.com
- Check Fonnte dashboard → Logs untuk error details

### "Message already sent" error
```bash
# Use forceSend flag untuk resend
"forceSend": true
```

### Phone number validation failing
Supported formats (all automatically converted):
- ✅ `08123456789` → normalized to `628123456789`
- ✅ `628123456789` → stays `628123456789`
- ✅ `+628123456789` → normalized to `628123456789`

---

## 📞 Quick PowerShell Script

Save as `test-whatsapp.ps1`:

```powershell
# Configuration
$PROJECT_REF = "your-project-ref"
$ANON_KEY = "your-anon-key"
$PHONE = "6285210017968"
$CUSTOMER_NAME = "Budi Santoso"
$TICKET_ID = 1
$QUANTITY = 2
$SELECTED_DATE = "2026-05-20"
$TIME_SLOT = "19:00"
$API_URL = "https://$PROJECT_REF.supabase.co"

# Create order
Write-Host "Creating ticket order..." -ForegroundColor Cyan
$order_response = curl -X POST "$API_URL/functions/v1/create-doku-ticket-checkout" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d @"
{
  "ticketId": $TICKET_ID,
  "quantity": $QUANTITY,
  "selectedDate": "$SELECTED_DATE",
  "selectedTimeSlots": ["$TIME_SLOT"],
  "customerName": "$CUSTOMER_NAME",
  "customerPhone": "$PHONE",
  "customerEmail": "budi@example.com"
}
"@ | ConvertFrom-Json

$ORDER_NUMBER = $order_response.orderNumber
Write-Host "Order created: $ORDER_NUMBER" -ForegroundColor Green

# Send WhatsApp
Write-Host "Sending WhatsApp..." -ForegroundColor Cyan
$whatsapp_response = curl -X POST "$API_URL/functions/v1/send-whatsapp-invoice" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d @"
{
  "orderNumber": "$ORDER_NUMBER"
}
"@ | ConvertFrom-Json

Write-Host "Result:" -ForegroundColor Green
Write-Host ($whatsapp_response | ConvertTo-Json | Out-String)
```

Run:
```bash
powershell -ExecutionPolicy Bypass -File test-whatsapp.ps1
```

---

## 📚 Related Documentation
- [WhatsApp Invoice Notifications](./WHATSAPP_README.md)
- [Fonnte Integration](./whatsapp-invoice-notifications.md)
- [DOKU Payments](./doku-payments.md)
