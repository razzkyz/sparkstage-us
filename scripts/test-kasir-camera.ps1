# Test Kasir Camera Permission Setup (Windows PowerShell)
# Usage: .\scripts\test-kasir-camera.ps1

Write-Host "🔍 Testing Kasir Camera Permission Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if frontend/index.html has Permissions-Policy
Write-Host "✓ Checking frontend/index.html for Permissions-Policy..." -ForegroundColor White
$htmlContent = Get-Content "frontend/index.html" -Raw
if ($htmlContent -match "Permissions-Policy") {
    Write-Host "  ✅ Found Permissions-Policy meta tag" -ForegroundColor Green
} else {
    Write-Host "  ❌ Permissions-Policy NOT FOUND - camera might be blocked" -ForegroundColor Red
    Write-Host "  💡 Try running: npm run dev (will reload with fix)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ Checking useUserRole hook..." -ForegroundColor White
if (Test-Path "frontend/src/hooks/useUserRole.ts") {
    Write-Host "  ✅ useUserRole.ts exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ useUserRole.ts NOT FOUND - will cause import error" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Next Steps for Kasir:" -ForegroundColor Cyan
Write-Host "  1. Run: npm run dev" -ForegroundColor White
Write-Host "  2. Hard refresh browser: Ctrl+Shift+Del (clear cache), then Ctrl+F5" -ForegroundColor White
Write-Host "  3. Login as kasir@gmail.com" -ForegroundColor White
Write-Host "  4. Go to 'Scan QR Produk' menu" -ForegroundColor White
Write-Host "  5. Click 'Aktifkan Pemindai'" -ForegroundColor White
Write-Host "  6. Allow camera when browser prompts" -ForegroundColor White
Write-Host "  7. Camera feed should now appear!" -ForegroundColor White

Write-Host ""
Write-Host "❓ If camera still not showing:" -ForegroundColor Yellow
Write-Host "  1. Open DevTools: F12" -ForegroundColor White
Write-Host "  2. Go to Console tab" -ForegroundColor White
Write-Host "  3. Look for '[Violation]' errors" -ForegroundColor White
Write-Host "  4. Check browser camera permission in settings" -ForegroundColor White
Write-Host ""
