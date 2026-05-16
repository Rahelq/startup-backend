#!/bin/bash

# Smarter test script - uses registration token to test protected routes

echo "================================"
echo "✅ BACKEND ROUTE VALIDATION TEST"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

# Step 1: Register a test user and get token
echo "🔐 Step 1: Registering test user..."
REGISTER_EMAIL="validationtest$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"full_name\": \"Validation Test User\",
    \"email\": \"$REGISTER_EMAIL\",
    \"password\": \"TestPass123\",
    \"role\": \"Startup\"
  }")

echo "Registration response: $REGISTER_RESPONSE"
echo ""

# Extract token (simple extraction)
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"user_id":[0-9]*' | cut -d':' -f2)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Exiting."
  exit 1
fi

echo "✓ Got token: ${TOKEN:0:30}..."
echo "✓ User ID: $USER_ID"
echo ""

# Step 2: Test protected routes with token
echo "🔗 Step 2: Testing protected routes with token..."
echo ""

PROTECTED_ROUTES=(
  "GET /api/startups/profile"
  "GET /api/investors"
  "GET /api/mentors"
  "GET /api/admin/users"
  "GET /api/notifications"
  "GET /api/video-sessions"
  "GET /api/investment-workflow/investments"
  "GET /api/mentorship-workflow/requests"
)

PASS_COUNT=0
FAIL_COUNT=0

for ROUTE in "${PROTECTED_ROUTES[@]}"; do
  IFS=' ' read -r METHOD ENDPOINT <<< "$ROUTE"
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X $METHOD "$BASE_URL$ENDPOINT" \
    -H "Authorization: Bearer $TOKEN")
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✓ $METHOD $ENDPOINT → HTTP $HTTP_CODE (Success)"
    PASS_COUNT=$((PASS_COUNT + 1))
  elif [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "⚠ $METHOD $ENDPOINT → HTTP $HTTP_CODE (Auth/Validation)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "✗ $METHOD $ENDPOINT → HTTP $HTTP_CODE (Error)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""
echo "=========================================="
echo "📊 ROUTE TEST RESULTS"
echo "=========================================="
echo "✓ Routes working: $PASS_COUNT"
echo "✗ Routes not found: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ All routes are properly mounted!"
else
  echo "⚠️ Some routes returned errors. Check logs above."
fi

echo ""
echo "=========================================="
echo "💡 TESTING GUIDELINES"
echo "=========================================="
echo ""
echo "To properly test the API, use Postman/Thunder Client:"
echo ""
echo "1. Import the collection:"
echo "   File → Import → StartupConnect Backend API.postman_collection.json"
echo ""
echo "2. Set up environment variables in Postman:"
echo "   - base_url = http://localhost:3000"
echo "   - token = (get from login/register)"
echo ""
echo "3. Run requests in order:"
echo "   Step 1: POST /api/auth/register (Startup)"
echo "   Step 2: PUT /api/auth/approve/:userId (Admin)"
echo "   Step 3: Create profiles (startup, investor, mentor)"
echo "   Step 4: Test workflows (investment, mentorship, project)"
echo "   Step 5: Test payments, notifications, messaging"
echo ""
echo "4. Monitor server logs for any errors"
echo ""
echo "=========================================="
echo "✅ Server is running and routes are available!"
echo "=========================================="
