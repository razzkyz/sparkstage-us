# SparkStage US Version - Setup Script (PowerShell)
# This script helps you set up the US version with Stripe payments

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "SparkStage US Version Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Installing frontend dependencies..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"
Set-Location frontend
npm install @stripe/stripe-js@^2.4.0 @stripe/react-stripe-js@^2.4.0
Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

Set-Location ..

Write-Host "Step 2: Creating environment file..." -ForegroundColor Yellow
Write-Host "-------------------------------------"
if (Test-Path ".env.local") {
    Write-Host "Warning: .env.local already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Skipping environment file creation"
    } else {
        Copy-Item .env.us-example .env.local
        Write-Host "[OK] Created .env.local from template" -ForegroundColor Green
    }
} else {
    Copy-Item .env.us-example .env.local
    Write-Host "[OK] Created .env.local from template" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 3: Checking Stripe CLI..." -ForegroundColor Yellow
Write-Host "-------------------------------"
$stripeInstalled = Get-Command stripe -ErrorAction SilentlyContinue
if ($stripeInstalled) {
    Write-Host "[OK] Stripe CLI is installed" -ForegroundColor Green
    stripe version
} else {
    Write-Host "[!] Stripe CLI not found" -ForegroundColor Yellow
    Write-Host "Download from: https://github.com/stripe/stripe-cli/releases/latest"
}
Write-Host ""

Write-Host "Step 4: Checking Supabase CLI..." -ForegroundColor Yellow
Write-Host "---------------------------------"
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseInstalled) {
    Write-Host "[OK] Supabase CLI is installed" -ForegroundColor Green
    supabase --version
} else {
    Write-Host "[X] Supabase CLI not found" -ForegroundColor Red
    Write-Host "Install from: https://supabase.com/docs/guides/cli"
    exit 1
}
Write-Host ""

Write-Host "Step 5: Next Steps" -ForegroundColor Yellow
Write-Host "------------------"
Write-Host "1. Create Stripe account at https://stripe.com"
Write-Host "2. Get test API keys from Stripe Dashboard"
Write-Host "3. Update .env.local with your Stripe publishable key"
Write-Host "4. Set Supabase secrets:"
Write-Host "   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx"
Write-Host "   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx"
Write-Host "5. Create database migration:"
Write-Host "   supabase migration new add_stripe_payment_fields"
Write-Host "6. Follow QUICKSTART_ID.md for detailed instructions"
Write-Host ""
Write-Host "[OK] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Read documentation:" -ForegroundColor Cyan
Write-Host "  - QUICKSTART_ID.md (Bahasa Indonesia)"
Write-Host "  - MIGRATION_COMPARISON.md (Technical comparison)"
Write-Host "  - DEPLOYMENT_GUIDE.md (Production deployment)"
Write-Host ""
