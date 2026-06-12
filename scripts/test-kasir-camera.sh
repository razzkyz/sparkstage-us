#!/usr/bin/env bash
# Test Kasir Camera Permission Setup
# Usage: bash scripts/test-kasir-camera.sh

echo "🔍 Testing Kasir Camera Permission Setup..."
echo ""

# Check if frontend/index.html has Permissions-Policy
echo "✓ Checking frontend/index.html for Permissions-Policy..."
if grep -q 'Permissions-Policy' frontend/index.html; then
    echo "  ✅ Found Permissions-Policy meta tag"
else
    echo "  ❌ Permissions-Policy NOT FOUND - camera might be blocked"
    echo "  💡 Try running: npm run dev (will reload with fix)"
fi

echo ""
echo "✓ Checking useUserRole hook..."
if [ -f "frontend/src/hooks/useUserRole.ts" ]; then
    echo "  ✅ useUserRole.ts exists"
else
    echo "  ❌ useUserRole.ts NOT FOUND - will cause import error"
fi

echo ""
echo "📋 Next Steps for Kasir:"
echo "  1. Run: npm run dev"
echo "  2. Hard refresh browser: Ctrl+Shift+Del (clear cache), then Ctrl+F5"
echo "  3. Login as kasir@gmail.com"
echo "  4. Go to 'Scan QR Produk' menu"
echo "  5. Click 'Aktifkan Pemindai'"
echo "  6. Allow camera when browser prompts"
echo "  7. Camera feed should now appear!"
echo ""
echo "❓ If camera still not showing:"
echo "  1. Open DevTools: F12"
echo "  2. Go to Console tab"
echo "  3. Look for '[Violation]' errors"
echo "  4. Check browser camera permission in settings"
echo ""
