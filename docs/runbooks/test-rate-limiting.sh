#!/bin/bash
# ============================================
# Rate Limiting Test Script
# Tests checkout rate limiting (max 10 requests per minute)
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-your_jwt_token_here}"
ENDPOINT="/api/checkout/ticket"
MAX_REQUESTS=10
WINDOW_MS=60000

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Rate Limiting Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "API URL: $API_URL"
echo "Endpoint: $ENDPOINT"
echo "Rate Limit: $MAX_REQUESTS requests per $(($WINDOW_MS / 1000)) seconds"
echo ""

# Test 1: Normal requests (should all succeed)
echo -e "${BLUE}Test 1: Send ${GREEN}$((MAX_REQUESTS - 1))${NC} requests (should all succeed)${NC}"
for i in $(seq 1 $((MAX_REQUESTS - 1))); do
  echo -n "Request $i... "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$ENDPOINT" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "items": [{"ticketId": 1, "quantity": 1, "date": "2026-05-25", "timeSlot": "14:00"}],
      "customerName": "Test User",
      "customerEmail": "test@example.com"
    }')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [[ "$HTTP_CODE" =~ ^(200|201|400)$ ]]; then
    echo -e "${GREEN}OK${NC} (HTTP $HTTP_CODE)"
  else
    echo -e "${RED}FAILED${NC} (HTTP $HTTP_CODE)"
    echo "$BODY"
  fi
  
  sleep 0.1
done

echo ""
echo -e "${BLUE}Test 2: Send request ${RED}$MAX_REQUESTS${NC} (should succeed - at limit)${NC}"
echo -n "Request $MAX_REQUESTS... "

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"ticketId": 1, "quantity": 1, "date": "2026-05-25", "timeSlot": "14:00"}],
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" =~ ^(200|201|400)$ ]]; then
  echo -e "${GREEN}OK${NC} (HTTP $HTTP_CODE)"
else
  echo -e "${RED}FAILED${NC} (HTTP $HTTP_CODE)"
fi

echo ""
echo -e "${BLUE}Test 3: Send request $(($MAX_REQUESTS + 1)) (should be RATE LIMITED - 429)${NC}"
echo -n "Request $(($MAX_REQUESTS + 1))... "

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"ticketId": 1, "quantity": 1, "date": "2026-05-25", "timeSlot": "14:00"}],
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" == "429" ]]; then
  echo -e "${GREEN}✓ RATE LIMITED${NC} (HTTP 429)"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [[ "$HTTP_CODE" =~ ^(200|201)$ ]]; then
  echo -e "${RED}✗ NOT RATE LIMITED${NC} (HTTP $HTTP_CODE - expected 429)"
else
  echo -e "${YELLOW}? UNEXPECTED${NC} (HTTP $HTTP_CODE)"
fi

echo ""
echo -e "${BLUE}Test 4: Wait ${YELLOW}$((WINDOW_MS / 1000))${NC} seconds and retry (should succeed)${NC}"
echo "Waiting..."
sleep $((WINDOW_MS / 1000 + 1))

echo -n "Retry request... "

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"ticketId": 1, "quantity": 1, "date": "2026-05-25", "timeSlot": "14:00"}],
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" =~ ^(200|201|400)$ ]]; then
  echo -e "${GREEN}OK${NC} (HTTP $HTTP_CODE)"
  echo "Window reset successfully!"
else
  echo -e "${RED}FAILED${NC} (HTTP $HTTP_CODE)"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Rate Limiting Test Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "- Set AUTH_TOKEN environment variable with valid JWT"
echo "- Rate limit is per user per endpoint"
echo "- Window resets after 60 seconds"
echo "- Use in development/staging ONLY (requires admin access)"
