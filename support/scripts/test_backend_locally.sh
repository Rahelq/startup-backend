#!/bin/bash

# Backend API Test Script
# Tests all critical endpoints before Render deployment

echo "================================"
echo "🧪 BACKEND COMPREHENSIVE TEST"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"
REGISTER_EMAIL="testuser$(date +%s)@example.com"
TEST_PASSWORD="TestPass123"
STARTUP_ROLE="Startup"
INVESTOR_ROLE="Investor"
ADMIN_ROLE="Admin"
MENTOR_ROLE="Mentor"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local METHOD=$1
    local ENDPOINT=$2
    local BODY=$3
    local AUTH_TOKEN=$4
    local EXPECTED_CODE=$5
    local TEST_NAME=$6

    echo -n "Testing: $TEST_NAME ... "
    
    if [ -z "$AUTH_TOKEN" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$BASE_URL$ENDPOINT" \
            -H "Content-Type: application/json" \
            -d "$BODY" 2>/dev/null)
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$BASE_URL$ENDPOINT" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "$BODY" 2>/dev/null)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "$EXPECTED_CODE" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$BODY_RESPONSE"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $EXPECTED_CODE, Got $HTTP_CODE)"
        echo "Response: $BODY_RESPONSE"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo ""
echo "=========================================="
echo "1️⃣  DATABASE CONNECTION TEST"
echo "=========================================="

test_endpoint "GET" "/" "{}" "" "200" "Database Connection"

echo ""
echo "=========================================="
echo "2️⃣  AUTHENTICATION TESTS"
echo "=========================================="

# Register User (Startup)
STARTUP_REGISTER="{
  \"full_name\": \"Startup Test User\",
  \"email\": \"$REGISTER_EMAIL\",
  \"password\": \"$TEST_PASSWORD\",
  \"role\": \"$STARTUP_ROLE\"
}"

test_endpoint "POST" "/api/auth/register" "$STARTUP_REGISTER" "" "201" "Register Startup User"

# Extract user info from response (if successful)
# For now, we'll need to manually create test users since we can't parse JSON easily in bash

echo ""
echo "ℹ️  Note: Full auth flow requires JWT tokens. Testing basic endpoint availability..."
echo ""

test_endpoint "POST" "/api/auth/login" "{\"email\":\"test@test.com\",\"password\":\"test\"}" "" "400\|401" "Login Endpoint (Should reject bad credentials)"

echo ""
echo "=========================================="
echo "3️⃣  ROUTE AVAILABILITY TESTS"
echo "=========================================="

echo "Checking all routes are mounted..."

ROUTES=(
    "GET /api/startups"
    "GET /api/projects"
    "GET /api/investments"
    "GET /api/investment-workflow/investments"
    "GET /api/mentorship"
    "GET /api/mentorship-workflow/requests"
    "GET /api/projects-workflow/projects"
    "GET /api/investors"
    "GET /api/mentors"
    "GET /api/admin/users"
    "GET /api/notifications"
    "GET /api/conversations"
    "GET /api/messages"
    "GET /api/video-sessions"
)

for ROUTE in "${ROUTES[@]}"; do
    IFS=' ' read -r METHOD ENDPOINT <<< "$ROUTE"
    # These should return 401/403 (auth required) or 200 (no auth needed)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X $METHOD "$BASE_URL$ENDPOINT")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "400" ]; then
        echo -e "${GREEN}✓${NC} $METHOD $ENDPOINT (HTTP $HTTP_CODE - Route Available)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $METHOD $ENDPOINT (HTTP $HTTP_CODE - Route Not Found?)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
done

echo ""
echo "=========================================="
echo "4️⃣  POSTMAN COLLECTION VALIDATION"
echo "=========================================="

if [ -f "StartupConnect Backend API.postman_collection.json" ]; then
    echo -e "${GREEN}✓${NC} Postman collection found"
    POSTMAN_ENDPOINTS=$(grep -o '"method":"[^"]*","path":"[^"]*"' "StartupConnect Backend API.postman_collection.json" | wc -l)
    echo "  Total endpoints in collection: ~$POSTMAN_ENDPOINTS"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} Postman collection NOT found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}✓ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}✗ Failed: $TESTS_FAILED${NC}"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✅${NC}"
else
    echo -e "${YELLOW}Some tests failed. Review errors above.${NC}"
fi

echo ""
echo "=========================================="
echo "🚀 NEXT STEPS"
echo "=========================================="
echo "1. Use Postman/Thunder Client to run full test suite"
echo "2. Test complete workflows (auth → investment → payment)"
echo "3. Verify real-time Socket.io events"
echo "4. Check error handling and edge cases"
echo "5. Run performance/load testing if needed"
echo "6. Deploy to Render when all tests pass"
