#!/bin/bash

# Test Netlify Function: test-stealth
# This script tests the serverless Chromium + stealth plugin deployment

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Netlify Function: test-stealth"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Netlify URL (update once deployed)
NETLIFY_URL="https://wdashboard.netlify.app"
# Or use local testing: netlify dev
# LOCAL_URL="http://localhost:8888"

TEST_URL="${NETLIFY_URL}/api/test-stealth"

echo ""
echo -e "${YELLOW}📡 Endpoint:${NC} $TEST_URL"
echo -e "${YELLOW}⏰ Starting test...${NC}"
echo ""

START_TIME=$(date +%s)

# Make the request
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$TEST_URL")

# Extract HTTP code
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}HTTP Status:${NC} $HTTP_CODE"
echo -e "${YELLOW}Duration:${NC} ${DURATION}s"

# Parse JSON response
SUCCESS=$(echo "$BODY" | grep -o '"success":[^,}]*' | cut -d':' -f2 | tr -d ' ')
WALLETS=$(echo "$BODY" | grep -o '"walletsFound":[0-9]*' | cut -d':' -f2)
FUNCTION_DURATION=$(echo "$BODY" | grep -o '"duration":[0-9.]*' | cut -d':' -f2)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ HTTP 200 OK${NC}"
else
    echo -e "${RED}❌ HTTP $HTTP_CODE${NC}"
fi

if [ "$SUCCESS" == "true" ]; then
    echo -e "${GREEN}✅ Success: true${NC}"
    echo -e "${GREEN}✅ Wallets Found: $WALLETS${NC}"
    echo -e "${YELLOW}⏱️  Function Duration: ${FUNCTION_DURATION}s${NC}"
else
    echo -e "${RED}❌ Success: false${NC}"
    echo -e "${RED}❌ Wallets Found: $WALLETS${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 FULL RESPONSE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$SUCCESS" == "true" ] && [ "$WALLETS" -gt 0 ]; then
    echo -e "${GREEN}🎉 TEST PASSED - Netlify serverless Chromium working!${NC}"
    echo -e "${GREEN}   Found $WALLETS wallets in ${FUNCTION_DURATION}s${NC}"
else
    echo -e "${RED}❌ TEST FAILED - Check logs above${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
