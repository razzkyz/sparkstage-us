#!/bin/bash
# SparkStage US Version - Setup Script
# This script helps you set up the US version with Stripe payments

set -e

echo "================================================"
echo "SparkStage US Version Setup"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo "Step 1: Installing frontend dependencies..."
echo "-------------------------------------------"
cd frontend
npm install @stripe/stripe-js@^2.4.0 @stripe/react-stripe-js@^2.4.0
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

cd ..

echo "Step 2: Creating environment file..."
echo "-------------------------------------"
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local already exists${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping environment file creation"
    else
        cp .env.us-example .env.local
        echo -e "${GREEN}✓ Created .env.local from template${NC}"
    fi
else
    cp .env.us-example .env.local
    echo -e "${GREEN}✓ Created .env.local from template${NC}"
fi
echo ""

echo "Step 3: Checking Stripe CLI..."
echo "-------------------------------"
if command -v stripe &> /dev/null; then
    echo -e "${GREEN}✓ Stripe CLI is installed${NC}"
    stripe version
else
    echo -e "${YELLOW}⚠ Stripe CLI not found${NC}"
    echo "Install from: https://stripe.com/docs/stripe-cli"
fi
echo ""

echo "Step 4: Checking Supabase CLI..."
echo "---------------------------------"
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI is installed${NC}"
    supabase --version
else
    echo -e "${RED}✗ Supabase CLI not found${NC}"
    echo "Install from: https://supabase.com/docs/guides/cli"
    exit 1
fi
echo ""

echo "Step 5: Next Steps"
echo "------------------"
echo "1. Create Stripe account at https://stripe.com"
echo "2. Get test API keys from Stripe Dashboard"
echo "3. Update .env.local with your Stripe publishable key"
echo "4. Set Supabase secrets:"
echo "   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx"
echo "   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx"
echo "5. Create database migration:"
echo "   supabase migration new add_stripe_payment_fields"
echo "6. Follow QUICKSTART_ID.md for detailed instructions"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Read documentation:"
echo "  - QUICKSTART_ID.md (Bahasa Indonesia)"
echo "  - MIGRATION_COMPARISON.md (Technical comparison)"
echo "  - DEPLOYMENT_GUIDE.md (Production deployment)"
echo ""
