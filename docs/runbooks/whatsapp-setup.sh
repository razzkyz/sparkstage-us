#!/bin/bash
# Quick Setup Script - WhatsApp Invoice System

# This script helps quickly set up the WhatsApp invoice notification system
# Usage: bash whatsapp-setup.sh

set -e

echo "🚀 WhatsApp Invoice System - Quick Setup"
echo "========================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo "Install: npm install -g supabase"
    exit 1
fi

# Get project ref
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo ""
    echo "📋 Enter your Supabase project reference:"
    read -p "Project ref (e.g., abc123def): " SUPABASE_PROJECT_REF
fi

echo ""
echo "🔑 Step 1: Get Fonnte API Token"
echo "================================"
echo "1. Go to https://fonnte.com"
echo "2. Sign up or login"
echo "3. Go to Settings → API"
echo "4. Copy your API token"
echo ""
read -p "Paste your Fonnte API token: " FONNTE_TOKEN

if [ -z "$FONNTE_TOKEN" ]; then
    echo "❌ Token not provided"
    exit 1
fi

echo ""
echo "⚙️  Step 2: Setting up Supabase secrets..."
supabase secrets set FONNTE_API_TOKEN="$FONNTE_TOKEN" \
    --project-ref "$SUPABASE_PROJECT_REF"

echo "✅ Secret set successfully"

echo ""
echo "📦 Step 3: Deploying functions..."
supabase functions deploy send-whatsapp-invoice \
    --project-ref "$SUPABASE_PROJECT_REF"

echo "✅ Function deployed successfully"

echo ""
echo "📊 Step 4: Verifying database..."
SUPABASE_URL=$(supabase projects list --json | jq -r ".[] | select(.ref==\"$SUPABASE_PROJECT_REF\") | .endpoint_id")

if [ -z "$SUPABASE_URL" ]; then
    echo "ℹ️  Could not auto-detect project URL"
    read -p "Enter your Supabase project URL (https://...): " SUPABASE_URL
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env files with:"
echo "   VITE_SUPABASE_URL=$SUPABASE_URL"
echo "   SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF"
echo ""
echo "2. Test with curl:"
echo "   curl -X POST $SUPABASE_URL/functions/v1/send-whatsapp-invoice \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -d '{\"orderNumber\": \"TKT-240513-TEST\"}'"
echo ""
echo "3. Read documentation:"
echo "   - docs/runbooks/whatsapp-invoice-notifications.md"
echo "   - docs/runbooks/whatsapp-api-examples.md"
echo ""
echo "🎉 You're all set!"
