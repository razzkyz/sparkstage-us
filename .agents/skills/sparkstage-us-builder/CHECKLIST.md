# SparkStage US Migration - Complete Checklist

## ✅ Pre-Migration (Week 1)

### Account Setup
- [ ] Create Stripe account (https://stripe.com)
- [ ] Verify business information
- [ ] Add bank account for payouts
- [ ] Get test API keys (pk_test_, sk_test_)
- [ ] Create EasyPost account (https://easypost.com)
- [ ] Get EasyPost test API key
- [ ] Setup Vercel account for deployment
- [ ] Verify Supabase project access

### Documentation Review
- [ ] Read QUICKSTART_ID.md completely
- [ ] Review MIGRATION_COMPARISON.md
- [ ] Understand ARCHITECTURE.md
- [ ] Check DEPLOYMENT_GUIDE.md
- [ ] Review us-dependencies.json

### Local Environment
- [ ] Install Node.js 18+
- [ ] Install Supabase CLI
- [ ] Install Stripe CLI
- [ ] Clone/fork repository
- [ ] Run setup script: `./scripts/setup-us-version.ps1`

## 🔧 Development (Week 2-3)

### Database Migration
- [ ] Create migration file: `supabase migration new add_stripe_fields`
- [ ] Add Stripe columns to `orders` table
- [ ] Add Stripe columns to `order_products` table
- [ ] Update indexes for performance
- [ ] Test migration on local database
- [ ] Push to development environment

### Backend Development
- [ ] Create `create-stripe-ticket-checkout` function
- [ ] Create `create-stripe-product-checkout` function
- [ ] Create `stripe-webhook` function
- [ ] Create `sync-stripe-payment-status` function
- [ ] Create `calculate-shipping-cost` function
- [ ] Update `_shared/payment-effects.ts`
- [ ] Test all functions locally

### Frontend Development
- [ ] Install Stripe dependencies
- [ ] Create Stripe Elements wrapper component
- [ ] Update PaymentPage.tsx
- [ ] Update ProductCheckoutPage.tsx
- [ ] Update success pages
- [ ] Add shipping address form
- [ ] Update currency formatters (IDR → USD)
- [ ] Test payment flow end-to-end

### Localization
- [ ] Update i18n from Indonesian to English
- [ ] Translate all user-facing text
- [ ] Update date formats (DD/MM/YYYY → MM/DD/YYYY)
- [ ] Update phone number formats
- [ ] Update address format validation

## 🧪 Testing (Week 4)

### Unit Testing
- [ ] Test Stripe webhook signature verification
