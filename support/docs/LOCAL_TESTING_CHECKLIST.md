# 🧪 Backend Testing Checklist - Local Deployment

## ✅ SETUP VERIFICATION

- [x] Backend reorganized to `backend/src/` structure
- [x] Server starts successfully on port 3000
- [x] Database connection working (PostgreSQL)
- [x] Environment variables loaded correctly
  - DB_USER=postgres
  - DB_HOST=localhost
  - DB_NAME=startup_connect
  - Zoom credentials ✅
  - Chapa payment keys ✅
- [x] Socket.io initialized
- [x] Session reminder service running

---

## 🔐 AUTHENTICATION TESTS

### Test 1: Register User
```
POST /api/auth/register
Body: {
  "full_name": "Test User",
  "email": "testuser@example.com",
  "password": "TestPassword123",
  "role": "Startup"
}
Expected: 201 Created + user_id
```

### Test 2: Login User
```
POST /api/auth/login
Body: {
  "email": "testuser@example.com",
  "password": "TestPassword123"
}
Expected: 200 OK + accessToken + refreshToken
```

### Test 3: Admin Approval
```
PUT /api/auth/approve/:userId
Headers: Authorization: Bearer <adminToken>
Expected: 200 OK (user approved)
```

### Test 4: Refresh Token
```
POST /api/auth/refresh
Body: { "refreshToken": "<token>" }
Expected: 200 OK + new accessToken
```

---

## 💼 INVESTMENT WORKFLOW TESTS

### Test 5: Create Investment Offer (Startup)
```
POST /api/investment-workflow/investments
Headers: Authorization: Bearer <startupToken>
Body: {
  "startup_id": <id>,
  "investor_id": <id>,
  "amount_needed": 50000,
  "equity_offered": 10,
  "investment_stage": "Seed",
  "business_description": "Tech startup",
  "use_of_funds": "Product development",
  "expected_roi": 25
}
Expected: 201 Created
```

### Test 6: List Investment Offers
```
GET /api/investment-workflow/investments
Headers: Authorization: Bearer <token>
Expected: 200 OK + array of investments
```

### Test 7: Submit Counter Offer (Investor)
```
PUT /api/investment-workflow/investments/:investmentId
Headers: Authorization: Bearer <investorToken>
Body: {
  "counter_amount": 40000,
  "counter_equity": 8,
  "investor_notes": "We can invest this amount"
}
Expected: 200 OK (counter offer submitted)
```

### Test 8: Accept Investment
```
POST /api/investment-workflow/investments/:investmentId/accept
Headers: Authorization: Bearer <startupToken>
Body: {}
Expected: 200 OK (investment accepted)
```

### Test 9: Process Payment
```
POST /api/transactions/payments/initiate
Headers: Authorization: Bearer <token>
Body: {
  "investment_id": <id>,
  "amount": 40000,
  "currency": "ETB"
}
Expected: 200 OK + payment link / checkoutUrl
```

### Test 10: Submit Investment Feedback
```
POST /api/investment-workflow/investments/:investmentId/feedback
Headers: Authorization: Bearer <token>
Body: {
  "rating": 5,
  "feedback_text": "Great partnership",
  "would_recommend": true
}
Expected: 201 Created
```

### Test 11: List Investment Feedback
```
GET /api/investment-workflow/feedback
Headers: Authorization: Bearer <token>
Expected: 200 OK + array of feedback
```

---

## 🎓 MENTORSHIP WORKFLOW TESTS

### Test 12: Create Mentorship Request
```
POST /api/mentorship-workflow/requests
Headers: Authorization: Bearer <startupToken>
Body: {
  "mentor_id": <id>,
  "mentee_id": <id>,
  "title": "Growth Strategy",
  "description": "Need help with market expansion",
  "category": "Business Strategy"
}
Expected: 201 Created
```

### Test 13: List Mentorship Requests
```
GET /api/mentorship-workflow/requests
Headers: Authorization: Bearer <token>
Expected: 200 OK + array of requests
```

### Test 14: Accept Mentorship Request
```
POST /api/mentorship-workflow/requests/:requestId/accept
Headers: Authorization: Bearer <mentorToken>
Body: {}
Expected: 200 OK
```

### Test 15: Schedule Session (Zoom)
```
POST /api/mentorship-workflow/sessions
Headers: Authorization: Bearer <token>
Body: {
  "mentorship_id": <id>,
  "session_title": "First Session",
  "session_date": "2026-05-20T14:00:00Z",
  "session_duration": 60
}
Expected: 201 Created + zoom_meeting_link
```

### Test 16: Submit Mentorship Feedback
```
POST /api/mentorship-workflow/feedback
Headers: Authorization: Bearer <token>
Body: {
  "mentorship_id": <id>,
  "rating": 5,
  "feedback_text": "Excellent mentorship",
  "areas_improved": ["Market Analysis", "Pitch Skills"]
}
Expected: 201 Created
```

---

## 📊 PROJECT WORKFLOW TESTS

### Test 17: Create Project
```
POST /api/projects-workflow/projects
Headers: Authorization: Bearer <startupToken>
Body: {
  "startup_id": <id>,
  "project_name": "Product Redesign",
  "project_description": "Complete UI/UX overhaul",
  "target_completion_date": "2026-06-30",
  "status": "In Progress",
  "budget": 15000
}
Expected: 201 Created
```

### Test 18: Update Project
```
PUT /api/projects-workflow/projects/:projectId
Headers: Authorization: Bearer <token>
Body: { "status": "Completed" }
Expected: 200 OK
```

### Test 19: Get Project Details
```
GET /api/projects-workflow/projects/:projectId
Headers: Authorization: Bearer <token>
Expected: 200 OK + project details
```

---

## 👨‍💼 ADMIN MODULE TESTS

### Test 20: List All Users (Admin Only)
```
GET /api/admin/users
Headers: Authorization: Bearer <adminToken>
Expected: 200 OK + array of users
```

### Test 21: Get User Details (Admin)
```
GET /api/admin/users/:userId
Headers: Authorization: Bearer <adminToken>
Expected: 200 OK + user details
```

### Test 22: Get Dashboard Stats (Admin)
```
GET /api/admin/dashboard/stats
Headers: Authorization: Bearer <adminToken>
Expected: 200 OK + {totalUsers, totalInvestments, totalRevenue, etc}
```

---

## 🔔 NOTIFICATION TESTS

### Test 23: Get User Notifications
```
GET /api/notifications
Headers: Authorization: Bearer <token>
Expected: 200 OK + array of notifications
```

---

## 💬 REAL-TIME COMMUNICATION TESTS

### Test 24: Create Conversation
```
POST /api/conversations
Headers: Authorization: Bearer <token>
Body: {
  "participant_ids": [<id1>, <id2>],
  "conversation_name": "Investment Discussion"
}
Expected: 201 Created
```

### Test 25: Send Message
```
POST /api/messages
Headers: Authorization: Bearer <token>
Body: {
  "conversation_id": <id>,
  "message_text": "Hello, interested in investing",
  "message_type": "text"
}
Expected: 201 Created + Socket.io event emitted
```

### Test 26: Get Messages (Pagination)
```
GET /api/messages?conversation_id=<id>&limit=20&offset=0
Headers: Authorization: Bearer <token>
Expected: 200 OK + array of messages
```

---

## 🎥 VIDEO SESSION TESTS

### Test 27: Schedule Video Session
```
POST /api/video-sessions/schedule
Headers: Authorization: Bearer <token>
Body: {
  "mentorship_id": <id>,
  "scheduled_time": "2026-05-20T14:00:00Z",
  "duration": 60
}
Expected: 201 Created + zoom_link
```

---

## 🧪 TEST SUMMARY

**Total Tests:** 27  
**Categories:**
- Authentication: 4 tests
- Investment Workflow: 7 tests
- Mentorship Workflow: 5 tests
- Project Workflow: 3 tests
- Admin Module: 3 tests
- Notifications: 1 test
- Real-time Communication: 3 tests
- Video Sessions: 1 test

---

## ✅ READINESS CHECKLIST (Before Render Deployment)

- [ ] All 27 tests pass
- [ ] No 404 or 500 errors
- [ ] Database queries respond < 500ms
- [ ] Socket.io events emit correctly
- [ ] Payment gateway responds (or test mode enabled)
- [ ] Zoom API credentials work
- [ ] All routes protected with auth middleware
- [ ] Error handling working correctly
- [ ] Logs clear and informative
- [ ] .env file configured for Render

---

## 📝 RENDER DEPLOYMENT PREREQUISITES

- [ ] Create PostgreSQL database on Render
- [ ] Set environment variables on Render:
  ```
  DB_USER=<render_postgres_user>
  DB_HOST=<render_postgres_host>
  DB_PASSWORD=<render_postgres_password>
  DB_NAME=<render_database_name>
  DB_PORT=5432
  PORT=10000
  ZOOM_ENABLED=true
  ZOOM_USER_ID=<zoom_email>
  ZOOM_ACCOUNT_ID=<zoom_account_id>
  ZOOM_CLIENT_ID=<zoom_client_id>
  ZOOM_CLIENT_SECRET=<zoom_client_secret>
  CHAPA_PUBLIC_KEY=<chapa_key>
  CHAPA_SECRET_KEY=<chapa_secret>
  CHAPA_RETURN_URL=<render_app_url>
  CHAPA_CALLBACK_URL=<render_app_url>/api/payments/webhooks/chapa
  CHAPA_BASE_URL=https://api.chapa.co/v1
  ```
- [ ] Confirm database migrations run on Render
- [ ] Test API endpoints on Render URL
- [ ] Monitor logs for errors
- [ ] Set up error tracking (optional)

---

## 🚀 STATUS

- ✅ Code reorganized to src/ structure
- ✅ Server starts successfully
- ✅ Database connected
- ⏳ Testing all 27 API endpoints...
- ⏳ Documenting test results...
- ⏳ Final deployment checklist...
