#!/bin/bash

# Setup Kasir User Script
# This script creates kasir@gmail.com user and assigns kasir role
# Usage: bash setup-kasir-user.sh

set -e

echo "🔧 Spark Stage - Kasir User Setup Script"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g @supabase/cli"
    exit 1
fi

# Check if user is logged in to Supabase
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Make sure Supabase is linked:"
    echo "   supabase link"
    exit 1
fi

echo "📧 Creating kasir@gmail.com user..."
echo ""

# Create the user
KASIR_ID=$(supabase auth admin create-user \
    --email kasir@gmail.com \
    --password $(openssl rand -base64 12) \
    --no-confirm \
    2>/dev/null | jq -r '.id' || echo "")

if [ -z "$KASIR_ID" ] || [ "$KASIR_ID" = "null" ]; then
    echo "⚠️  Could not create user automatically (might already exist)"
    echo ""
    echo "Manual Setup Instructions:"
    echo "1. Go to Supabase Dashboard → Authentication → Users"
    echo "2. Click '+ Add user'"
    echo "3. Email: kasir@gmail.com"
    echo "4. Password: [choose secure password]"
    echo "5. Click 'Create user'"
    echo "6. Copy the User ID (UUID)"
    echo ""
    read -p "Enter kasir User ID here: " KASIR_ID
fi

if [ -z "$KASIR_ID" ]; then
    echo "❌ No user ID provided. Exiting."
    exit 1
fi

echo "✅ User ID: $KASIR_ID"
echo ""

echo "🔑 Assigning kasir role..."

# Assign role via SQL
RESULT=$(supabase sql --command "
INSERT INTO public.user_role_assignments (user_id, role_name, created_at)
VALUES ('$KASIR_ID', 'kasir', NOW())
ON CONFLICT (user_id, role_name) DO NOTHING;

SELECT ura.user_id, ura.role_name, u.email
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'kasir@gmail.com';
" 2>&1 || echo "Failed")

if echo "$RESULT" | grep -q "kasir"; then
    echo "✅ Role assigned successfully!"
    echo ""
    echo "✨ Setup Complete!"
    echo ""
    echo "📝 Login Details:"
    echo "   Email: kasir@gmail.com"
    echo "   Password: [the password you set]"
    echo "   URL: http://localhost:5173/login"
    echo ""
    echo "📊 Kasir Dashboard:"
    echo "   After login, you'll be redirected to:"
    echo "   http://localhost:5173/admin/cashier-dashboard"
else
    echo "⚠️  Could not verify role assignment"
    echo "Please verify in Supabase SQL Editor:"
    echo ""
    echo "SELECT ura.user_id, ura.role_name, u.email"
    echo "FROM public.user_role_assignments ura"
    echo "JOIN auth.users u ON u.id = ura.user_id"
    echo "WHERE u.email = 'kasir@gmail.com';"
fi
