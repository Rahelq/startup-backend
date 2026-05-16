# Admin Module Integration Checklist

## 🚀 Quick Start for Frontend Team

Use this checklist to integrate the admin module into your admin dashboard.

---

## 🧪 POSTMAN COLLECTION

- Import `backend/StartupConnect Backend API.postman_collection.json`
- Covers the full flow from registration/login through user profile, interactions, conversations, workflows, payments, video sessions, notifications, and admin tools
- Collection variables: `startupToken`, `mentorToken`, `investorToken`, `adminToken` and entity IDs (for example `investmentId`, `projectId`)
- URLs are already absolute (`http://localhost:3000/...`) so Postman import works without defining a `baseUrl` variable
- Suggested run order: auth logins first, then profile setup, then workflow/payment/admin requests

---

## 1️⃣ AUTHENTICATION

- [ ] Admin user logs in via `/api/auth/login`
  - Email & password
  - Returns JWT token
  - Token must have `user.role === "Admin"`

- [ ] Store token in localStorage/sessionStorage
- [ ] Pass token in all admin API calls:
  ```javascript
  headers: { Authorization: `Bearer ${adminToken}` }
  ```

---

## 2️⃣ DASHBOARD (Main View)

- [ ] `GET /api/admin/reports/overview`
  - Display: users, mentors, startups, investors, projects, sessions, payments
  - Use for KPI cards

---

## 3️⃣ USER MANAGEMENT

### Pending Users List
- [ ] `GET /api/admin/users/pending`
  - Show table with: first_name, last_name, email, role, created_at
  - Add "View Details" button

### View & Approve User
- [ ] `GET /api/admin/users/pending/:userId`
  - Show user profile + role-specific profile
  - Show uploaded documents
  - Display "Approve" and "Reject" buttons

- [ ] `PUT /api/admin/users/approve/:userId`
  - Body: `{ comment?: string }`
  - Show success toast

- [ ] `PUT /api/admin/users/reject/:userId`
  - Body: `{ reason?: string }`
  - Ask for reason before submit
  - Show confirmation dialog

### Search Users
- [ ] `GET /api/admin/users?role=Mentor&q=john&limit=50`
  - Filter by role dropdown (Mentor, Startup, Investor, Admin)
  - Search box for name/email
  - Pagination (limit/offset)

### User Details
- [ ] `GET /api/admin/users/:userId`
  - Show full user + profile

### Delete User
- [ ] `DELETE /api/admin/users/:userId`
  - Confirmation dialog
  - Confirm before deletion

---

## 4️⃣ PROFILE MODERATION

### Mentors
- [ ] List mentors (implicit from user search with role=Mentor)
- [ ] `PUT /api/admin/mentors/:mentorId/approve`
  - Approve button
- [ ] `PUT /api/admin/mentors/:mentorId/unapprove`
  - Reject/Unapprove button
  - Body: `{ reason?: string }`

### Investors
- [ ] `PUT /api/admin/investors/:investorId/approve`
- [ ] `PUT /api/admin/investors/:investorId/unapprove`
  - Same pattern as mentors

### Startups
- [ ] `GET /api/admin/startups`
  - Show startup listing with owner email, is_active, is_approved
- [ ] `PUT /api/admin/startups/:startupId/approve`
  - Set listing as approved
- [ ] `PUT /api/admin/startups/:startupId/unapprove`
  - Unpublish listing
- [ ] `PUT /api/admin/startups/:startupId/remove`
  - Deactivate startup owner

---

## 5️⃣ CONTENT MODERATION

### Documents
- [ ] `GET /api/admin/documents/:documentId`
  - View/Download link
- [ ] `DELETE /api/admin/documents/:documentId`
  - Delete button with confirmation

### Mentor Documents
- [ ] `GET /api/admin/mentor-documents/:documentId`
  - View/Download link
- [ ] `DELETE /api/admin/mentor-documents/:documentId`
  - Delete button with confirmation

### Projects
- [ ] `GET /api/admin/projects`
  - List projects with startup name, owner email
- [ ] `DELETE /api/admin/projects/:projectId`
  - Remove (sets status=cancelled)
- [ ] `PUT /api/admin/projects/:projectId/restore`
  - Restore if needed
- [ ] `PUT /api/admin/projects/:projectId/status`
  - Dropdown to select status: draft, active, funded, completed, cancelled

---

## 6️⃣ INVESTMENT OPERATIONS

- [ ] `GET /api/admin/projects`
  - Already covered in Content Moderation
- [ ] `GET /api/admin/investment-requests`
  - Show table with startup, investor, project names
- [ ] `PUT /api/admin/investment-requests/:id/status`
  - Update status (if needed)
- [ ] `GET /api/admin/investments`
  - View all investments
- [ ] `GET /api/admin/sessions?host_id=X&participant_id=Y&status=Z`
  - Filter video sessions by host, participant, status
- [ ] `GET /api/admin/payments?user_id=X&status=Y`
  - Filter payments by user, status

---

## 7️⃣ MENTORSHIP OPERATIONS

- [ ] `GET /api/admin/mentorship/overview`
  - Mentorship program stats
- [ ] `GET /api/admin/mentorship/requests`
  - View pending mentorship requests
- [ ] `GET /api/admin/mentorship/sessions`
  - View all sessions (similar to /sessions above)
- [ ] `GET /api/admin/mentorship/reports`
  - View mentorship reports
- [ ] `GET /api/admin/mentorship/resources`
  - View shared resources
- [ ] `GET /api/admin/mentorship/payments`
  - View mentorship-related payments

---

## 8️⃣ REPORTS & AUDIT

### Audit Logs
- [ ] `GET /api/admin/audit-logs?limit=100&offset=0`
  - Show table with: actor_user_id, action, entity_type, entity_id, details, created_at
  - Pagination
  - Filter by action if needed

### Export
- [ ] `GET /api/admin/audit-logs/export?since=2026-01-01&until=2026-04-30`
  - Export button, opens date range picker, downloads CSV
- [ ] `GET /api/admin/reports/export?type=users`
  - Dropdown to select type: users, projects, investments
  - Downloads CSV

### Schedule Report
- [ ] `POST /api/admin/reports/schedule`
  - Body: `{ type: string, run_at?: string }`
  - Form to schedule report generation

---

## 9️⃣ MAINTENANCE

- [ ] `GET /api/admin/maintenance/status`
  - Show database status as health indicator
- [ ] `POST /api/admin/maintenance/clear-audit-logs`
  - Body: `{ days?: 365 }`
  - Confirmation dialog before clearing

---

## 🎨 UI LAYOUT SUGGESTION

```
┌─────────────────────────────────────┐
│        ADMIN DASHBOARD              │
├─────────────────────────────────────┤
│                                     │
│  DASHBOARD TAB                      │
│  ├─ KPI Cards (users, mentors...)   │
│  ├─ Recent Activity (audit logs)    │
│  └─ Quick Actions                   │
│                                     │
│  USERS TAB                          │
│  ├─ Pending Approvals (badge: 5)    │
│  ├─ View User Details               │
│  └─ Search / Filter Users           │
│                                     │
│  PROFILES TAB                       │
│  ├─ Approve Mentors                 │
│  ├─ Approve Investors               │
│  └─ Approve Startups                │
│                                     │
│  CONTENT TAB                        │
│  ├─ Delete Documents                │
│  ├─ Manage Projects                 │
│  └─ Remove Resources                │
│                                     │
│  INVESTMENT TAB                     │
│  ├─ View Projects                   │
│  ├─ View Investment Requests        │
│  ├─ View Sessions                   │
│  └─ View Payments                   │
│                                     │
│  MENTORSHIP TAB                     │
│  ├─ Mentorship Overview             │
│  ├─ View Requests                   │
│  ├─ View Sessions                   │
│  ├─ View Reports                    │
│  └─ View Payments                   │
│                                     │
│  REPORTS TAB                        │
│  ├─ Audit Logs (searchable)         │
│  ├─ Export Data (users/projects)    │
│  └─ Schedule Reports                │
│                                     │
│  SETTINGS TAB                       │
│  ├─ System Status                   │
│  ├─ Clear Old Logs                  │
│  └─ Create Admin User               │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔑 API Response Examples

### Pending Users
```json
GET /api/admin/users/pending
{
  "pending": [
    {
      "user_id": 74,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "Mentor",
      "phone_number": "+251911234567",
      "created_at": "2026-05-06T10:00:00Z"
    }
  ]
}
```

### Dashboard Overview
```json
GET /api/admin/reports/overview
{
  "overview": {
    "users": 150,
    "startups": 45,
    "investors": 30,
    "mentors": 50,
    "projects": 60,
    "investment_requests": 25,
    "investments": 15,
    "payments": 120,
    "sessions": 200
  }
}
```

### Sessions List
```json
GET /api/admin/sessions
{
  "sessions": [
    {
      "id": 1,
      "host_id": 74,
      "host_email": "mentor@example.com",
      "participant_id": 75,
      "participant_email": "startup@example.com",
      "scheduled_at": "2026-05-15T14:00:00Z",
      "duration": 60,
      "status": "completed",
      "topic": "Business Strategy",
      "created_at": "2026-05-06T10:00:00Z"
    }
  ]
}
```

### Payments List
```json
GET /api/admin/payments
{
  "payments": [
    {
      "payment_id": 1,
      "user_id": 75,
      "user_email": "startup@example.com",
      "first_name": "Company",
      "last_name": "XYZ",
      "amount": 5000.00,
      "status": "completed",
      "created_at": "2026-05-06T10:00:00Z"
    }
  ]
}
```

---

## ⚠️ ERROR HANDLING

All endpoints return errors in this format:
```json
{ "error": "User not found" }
```

HTTP Status Codes:
- `200` — Success
- `400` — Bad request (validation error)
- `403` — Forbidden (not admin)
- `404` — Not found
- `409` — Conflict (e.g., user already exists)
- `500` — Server error

---

## 🧪 TESTING ENDPOINTS

Use Postman or curl to test:

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get pending users
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/admin/users/pending

# Approve user
curl -X PUT http://localhost:3000/api/admin/users/approve/74 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Approved"}'
```

---

## ✅ VERIFICATION

Before launching, verify:

- [ ] All endpoints return correct response format
- [ ] Token validation works (expired token returns 401)
- [ ] Non-admin users get 403 Forbidden
- [ ] Audit logs are recorded
- [ ] Notifications reach users
- [ ] Emails are sent for rejections
- [ ] Soft deletes work (hard delete with ?hard=true)
- [ ] Filters and pagination work
- [ ] File downloads work
- [ ] Date range filters work

---

## 📞 SUPPORT

If you encounter issues:

1. Check the admin controller logs
2. Verify JWT token is valid
3. Ensure user role is "Admin"
4. Check database connectivity
5. Review audit_logs table for action history

---

**Admin Module Ready for Integration! ✅**
