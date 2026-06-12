# WhatsApp Fonnte Setup Debug Script
# Check all prerequisites before testing

Write-Host "=== WhatsApp Fonnte Setup Debug ===" -ForegroundColor Cyan
Write-Host ""

# ===== CONFIG =====
$PROJECT_REF = "hogzjapnkvsihvvbgcdb"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzkyNTYsImV4cCI6MjA4Mzg1NTI1Nn0.R5aWWG8FY9lNlIh3FCKFWaz0zYkm78KyrbO_CA2Grlc"
$API_BASE = "https://$PROJECT_REF.supabase.co"

Write-Host "Project: $PROJECT_REF" -ForegroundColor Gray
Write-Host ""

# ===== 1. CHECK DATABASE TABLES =====
Write-Host "1️⃣  Checking database tables..." -ForegroundColor Yellow

$tables_to_check = @("whatsapp_messages", "fonnte_whatsapp_logs", "orders", "profiles")

foreach ($table in $tables_to_check) {
    Write-Host "   Checking: $table" -ForegroundColor Gray
    
    try {
        $resp = Invoke-WebRequest `
            -Uri "$API_BASE/rest/v1/$table?limit=1" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $ANON_KEY"
                "apikey" = $ANON_KEY
            } `
            -ErrorAction Stop
        
        Write-Host "   ✅ $table exists" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "   ❌ Unauthorized - ANON_KEY invalid" -ForegroundColor Red
            return
        }
        elseif ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "   ❌ $table not found" -ForegroundColor Red
        }
        else {
            Write-Host "   ⚠️  Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# ===== 2. CHECK ORDERS TABLE (Sample Data) =====
Write-Host "2️⃣  Checking if there are any orders..." -ForegroundColor Yellow

try {
    $resp = Invoke-WebRequest `
        -Uri "$API_BASE/rest/v1/orders?limit=5&select=id,order_number,status" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $ANON_KEY"
            "apikey" = $ANON_KEY
        } `
        -ErrorAction Stop
    
    $data = $resp.Content | ConvertFrom-Json
    
    if ($data.Count -gt 0) {
        Write-Host "   ✅ Found $($data.Count) orders" -ForegroundColor Green
        $data | ForEach-Object {
            Write-Host "      - $($_.order_number) (Status: $($_.status))" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "   ⚠️  No orders found - might be test database" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ❌ Error querying orders: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ===== 3. CHECK WHATSAPP_MESSAGES TABLE SCHEMA =====
Write-Host "3️⃣  Checking whatsapp_messages table structure..." -ForegroundColor Yellow

try {
    $resp = Invoke-WebRequest `
        -Uri "$API_BASE/rest/v1/whatsapp_messages?limit=0" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $ANON_KEY"
            "apikey" = $ANON_KEY
            "Prefer" = "count=exact"
        } `
        -ErrorAction Stop
    
    Write-Host "   ✅ whatsapp_messages table accessible" -ForegroundColor Green
    
    # Try to get column info from headers
    $headers = $resp.Headers
    Write-Host "   Response headers:" -ForegroundColor Gray
    $headers.Keys | ForEach-Object {
        if ($_ -like "*range*" -or $_ -like "*count*") {
            Write-Host "      $_: $($headers[$_])" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "   ❌ Error accessing whatsapp_messages: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ===== 4. CHECK EDGE FUNCTIONS =====
Write-Host "4️⃣  Checking Edge Functions..." -ForegroundColor Yellow

$functions = @("send-whatsapp-invoice", "create-doku-ticket-checkout", "doku-webhook")

foreach ($func in $functions) {
    Write-Host "   Checking: $func" -ForegroundColor Gray
    
    try {
        $resp = Invoke-WebRequest `
            -Uri "$API_BASE/functions/v1/$func" `
            -Method OPTIONS `
            -Headers @{
                "Authorization" = "Bearer $ANON_KEY"
            } `
            -ErrorAction Stop
        
        Write-Host "   ✅ $func accessible" -ForegroundColor Green
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode
        if ($statusCode -eq 404) {
            Write-Host "   ❌ $func not found (not deployed?)" -ForegroundColor Red
        }
        elseif ($statusCode -eq 401) {
            Write-Host "   ❌ Unauthorized" -ForegroundColor Red
        }
        else {
            Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# ===== 5. TEST PHONE NORMALIZATION =====
Write-Host "5️⃣  Testing phone number normalization..." -ForegroundColor Yellow

$test_phones = @(
    "+628521001xxxx",
    "628521001xxxx", 
    "08521001xxxx",
    "+62521001xxxx"
)

Write-Host "   (This would be normalized by the system:)" -ForegroundColor Gray
$test_phones | ForEach-Object {
    # Simulate normalizePhoneForFonnte logic
    $cleaned = $_ -replace "[^\d+]", "" -replace "^\+", ""
    
    if ($cleaned.StartsWith("0")) {
        $normalized = "62" + $cleaned.Substring(1)
    }
    elseif ($cleaned.StartsWith("62")) {
        $normalized = $cleaned
    }
    elseif ($cleaned.StartsWith("8")) {
        $normalized = "62" + $cleaned
    }
    else {
        $normalized = $cleaned
    }
    
    Write-Host "      $_ → 62..." -ForegroundColor Gray
}

Write-Host ""

# ===== SUMMARY =====
Write-Host "=== Debug Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. ✅ If all tables exist → Database OK" -ForegroundColor Gray
Write-Host "2. ✅ If functions accessible → Edge Functions OK" -ForegroundColor Gray
Write-Host "3. ⚠️  If ANON_KEY shows 401 → Need fresh key from Supabase" -ForegroundColor Gray
Write-Host "4. ⚠️  If tables missing → Run database migrations" -ForegroundColor Gray
Write-Host ""
Write-Host "Check Supabase console for:" -ForegroundColor Yellow
Write-Host "- Settings → Secrets → FONNTE_DEVICE_TOKEN or FONNTE_API_TOKEN" -ForegroundColor Gray
Write-Host "- Functions → send-whatsapp-invoice → Deployment status" -ForegroundColor Gray
Write-Host "- SQL Editor → SELECT * FROM whatsapp_messages LIMIT 1;" -ForegroundColor Gray
Write-Host ""
