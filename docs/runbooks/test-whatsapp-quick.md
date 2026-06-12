# WhatsApp Fonnte - Quick Test Template

## 🚀 Copy-Paste Ready Commands

### A. PowerShell (Windows)

```powershell
# ========== SETUP ==========
$PROJECT_REF = "hogzjapnkvsihvvbgcdb"      # ✅ Sudah filled
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzkyNTYsImV4cCI6MjA4Mzg1NTI1Nn0.R5aWWG8FY9lNlIh3FCKFWaz0zYkm78KyrbO_CA2Grlc"            # ✅ Sudah filled
$PHONE = "6285210017968"                    # Test phone (supports: 08xxx, 62xxx, +62xxx)
$CUSTOMER_NAME = "Budi Santoso"             # Test name
$TICKET_ID = 1                              # Adjust to valid ticket
$API_BASE = "https://$PROJECT_REF.supabase.co"

# ========== STEP 1: CREATE TICKET ORDER ==========
Write-Host "Step 1: Creating ticket order..." -ForegroundColor Cyan

$order_payload = @{
    ticketId = $TICKET_ID
    quantity = 2
    selectedDate = "2026-05-20"
    selectedTimeSlots = @("19:00")
    customerName = $CUSTOMER_NAME
    customerPhone = $PHONE
    customerEmail = "test@example.com"
} | ConvertTo-Json

$order_resp = Invoke-WebRequest -Uri "$API_BASE/functions/v1/create-doku-ticket-checkout" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $order_payload

$order_data = $order_resp.Content | ConvertFrom-Json
$ORDER_NUMBER = $order_data.orderNumber

Write-Host "✅ Order Created: $ORDER_NUMBER" -ForegroundColor Green
Write-Host "📍 Checkout URL: $($order_data.checkout_url)" -ForegroundColor Yellow

# ========== STEP 2: SEND WHATSAPP ==========
Write-Host "`nStep 2: Sending WhatsApp invoice..." -ForegroundColor Cyan

$whatsapp_payload = @{
    orderNumber = $ORDER_NUMBER
} | ConvertTo-Json

$whatsapp_resp = Invoke-WebRequest -Uri "$API_BASE/functions/v1/send-whatsapp-invoice" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $whatsapp_payload

$whatsapp_data = $whatsapp_resp.Content | ConvertFrom-Json

Write-Host "`n✅ Response:" -ForegroundColor Green
Write-Host ($whatsapp_data | ConvertTo-Json | Out-String)

# ========== STEP 3: VERIFY IN DATABASE ==========
Write-Host "`nStep 3: Query database untuk verify..." -ForegroundColor Cyan
Write-Host "Run SQL di Supabase Console:" -ForegroundColor Yellow
@"
SELECT order_number, customer_phone, delivery_status, created_at
FROM whatsapp_messages
WHERE order_number = '$ORDER_NUMBER'
LIMIT 1;
"@ | Write-Host -ForegroundColor Gray
```

### B. Bash / cURL (Mac / Linux)

```bash
#!/bin/bash

# ========== SETUP ==========
PROJECT_REF="YOUR_PROJECT_REF_HERE"
ANON_KEY="YOUR_ANON_KEY_HERE"
PHONE="6285210017968"
CUSTOMER_NAME="Budi Santoso"
TICKET_ID=1
API_BASE="https://$PROJECT_REF.supabase.co"

# ========== STEP 1: CREATE TICKET ORDER ==========
echo "Step 1: Creating ticket order..."

ORDER_RESP=$(curl -s -X POST "$API_BASE/functions/v1/create-doku-ticket-checkout" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"ticketId\": $TICKET_ID,
    \"quantity\": 2,
    \"selectedDate\": \"2026-05-20\",
    \"selectedTimeSlots\": [\"19:00\"],
    \"customerName\": \"$CUSTOMER_NAME\",
    \"customerPhone\": \"$PHONE\",
    \"customerEmail\": \"test@example.com\"
  }")

ORDER_NUMBER=$(echo $ORDER_RESP | jq -r '.orderNumber')

echo "✅ Order Created: $ORDER_NUMBER"
echo "📍 Checkout URL: $(echo $ORDER_RESP | jq -r '.checkout_url')"

# ========== STEP 2: SEND WHATSAPP ==========
echo -e "\nStep 2: Sending WhatsApp invoice..."

WHATSAPP_RESP=$(curl -s -X POST "$API_BASE/functions/v1/send-whatsapp-invoice" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderNumber\": \"$ORDER_NUMBER\"
  }")

echo "✅ Response:"
echo $WHATSAPP_RESP | jq .

# ========== STEP 3: VERIFY IN DATABASE ==========
echo -e "\nStep 3: Query database untuk verify..."
echo "Run SQL di Supabase Console:"
echo "SELECT order_number, customer_phone, delivery_status, created_at"
echo "FROM whatsapp_messages"
echo "WHERE order_number = '$ORDER_NUMBER';"
```

---

## 📋 Form Fields Reference

### Ticket Payment Page Expects:
- **Phone field ID**: `payment-customer-phone`
- **Placeholder**: `08xxxxxxxxxx atau +62xxxxxxxxx`
- **Accepted formats**: ✅ `08xxx`, ✅ `62xxx`, ✅ `+62xxx`
- **Help text**: "Format: 08xxxxxxxxxx, +62xxxxxxxxx, atau 62xxxxxxxxx. Kami akan mengirim reminder ke WhatsApp ini..."

### Product Checkout Page Expects:
- **Phone field ID**: `checkout-customer-phone`
- **Placeholder**: `+628xxxxxxxxxx atau 628xxxxxxxxxx atau 08xxxxxxxxxx`
- **Accepted formats**: ✅ `+62xxx`, ✅ `62xxx`, ✅ `08xxx`
- **Help text**: "Format: +628..., 628..., atau 08... (WhatsApp akan dikirim otomatis setelah pembayaran berhasil)"

---

## 🧪 Test Scenarios

### Scenario 1: Full Payment Flow (Realistic)
1. Open app → Select ticket
2. Input phone: **6285210017968** ← test phone
3. Input name: **Budi Santoso**
4. Pay via DOKU
5. **WhatsApp otomatis dikirim** ✅
6. Check phone in ~5 seconds

### Scenario 2: Direct API (Fastest)
1. Run PowerShell/Bash script ↑
2. Copy ORDER_NUMBER
3. Script triggers WhatsApp
4. **Message sent** ✅
5. Check phone dalam 2-3 seconds

### Scenario 3: Resend (If already sent)
Add flag di JSON:
```json
{
  "orderNumber": "TKT-240513-ABC123",
  "forceSend": true
}
```

---

## 🔐 Where to Get Credentials

| Credential | Where | How |
|---|---|---|
| `PROJECT_REF` | Supabase | Dashboard → Settings → General → Project Reference |
| `ANON_KEY` | Supabase | Dashboard → Settings → API → `anon` key (public) |
| `FONNTE_TOKEN` | Fonnte.com | Login → Settings → API → Copy Token |   

**❌ DO NOT commit credentials to git!**
- Use `.env.local` or secrets management
- Fonnte token should be in Supabase secrets (already set up)

---

## ✅ Success Indicators

### Phone Receives Message
Message format:
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

### API Returns 200 with Status
```json
{
  "status": "success",
  "message": "WhatsApp invoice sent successfully",
  "orderNumber": "TKT-240513-ABC123",
  "messageId": "fonnte_1234567890"
}
```

### Database Shows Entry
```sql
SELECT * FROM whatsapp_messages 
WHERE order_number = 'TKT-240513-ABC123'
-- Should show delivery_status: 'submitted' or 'delivered'
```

---

## 🚨 Common Issues & Fixes

| Issue | Solution |
|---|---|
| `"Invalid phone format"` | Use: `08xxx`, `62xxx`, or `+62xxx` |
| `"FONNTE_API_TOKEN not configured"` | Check Supabase secrets (should be pre-set) |
| `"Message already sent"` | Add `"forceSend": true` to JSON |
| `"Profile not found"` | Ensure order was created with valid user_id |
| Phone receives nothing in 10s | Check phone format, Fonnte account status |

---

## 📞 One-Line Quick Test

### PowerShell (Simplest)
```powershell
# Just set these 3 things:
$ref="your-ref"; $key="your-key"; $phone="6285210017968"

# Then run single command to check endpoint health:
curl -s -X GET "https://$ref.supabase.co/functions/v1/send-whatsapp-invoice" `
  -H "Authorization: Bearer $key"
```

### Bash
```bash
curl -s https://your-ref.supabase.co/functions/v1/send-whatsapp-invoice \
  -H "Authorization: Bearer your-key"
```

---

## 📚 Full Docs
See: `docs/runbooks/test-whatsapp-fonnte.md` for complete guide with troubleshooting, database queries, and all details.
