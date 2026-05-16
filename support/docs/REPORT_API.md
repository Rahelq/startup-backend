# Report & Moderation API Documentation

## Overview
The Report & Moderation system enables authenticated users to submit reports/flags about suspicious content or behavior, while providing admins with comprehensive tools to review, manage, and take action on these reports.

## Public Endpoints (Authenticated Users)

### POST /api/reports
Create a new report or flag.

**Request:**
```json
{
  "target_type": "user|content|message|profile",
  "target_id": 123,  // Optional - ID of the reported item
  "reason": "Suspicious activity detected"
}
```

**Response:**
```json
{
  "message": "Report submitted",
  "report": {
    "report_id": 1,
    "user_id": 42,
    "target_type": "user",
    "target_id": 123,
    "reason": "Suspicious activity detected",
    "status": "pending",
    "created_at": "2026-05-06T16:20:40.991Z"
  }
}
```

**Status Codes:**
- `201` - Report created successfully
- `400` - Invalid target_type or missing required fields
- `429` - Rate limit exceeded (10 reports per hour per user)

### GET /api/reports/my
Retrieve the current user's submitted reports.

**Query Parameters:**
- `limit` (default: 50) - Number of reports to return
- `offset` (default: 0) - Pagination offset
- `status` (optional) - Filter by status: `pending`, `reviewed`, `actioned`
- `sort_by` (default: `created_at`) - Sort field
- `sort_order` (default: `DESC`) - Sort direction: `ASC` or `DESC`

**Response:**
```json
{
  "reports": [
    {
      "report_id": 1,
      "target_id": 123,
      "target_type": "user",
      "reason": "Suspicious activity",
      "status": "pending",
      "created_at": "2026-05-06T16:20:40.991Z"
    }
  ]
}
```

## Admin Endpoints

### GET /api/admin/reports
List all submitted reports with advanced filtering and sorting.

**Query Parameters:**
- `limit` (default: 50) - Number of reports to return
- `offset` (default: 0) - Pagination offset
- `status` (optional) - Filter: `pending`, `reviewed`, `actioned`
- `target_type` (optional) - Filter: `user`, `content`, `message`, `profile`
- `sort_by` (default: `created_at`) - Sort field: `created_at`, `status`, `report_id`
- `sort_order` (default: `DESC`) - Sort direction: `ASC`, `DESC`

**Response:**
```json
{
  "reports": [
    {
      "report_id": 1,
      "user_id": 42,
      "target_id": 123,
      "target_type": "user",
      "reason": "Suspicious activity",
      "status": "pending",
      "metadata": {},
      "created_at": "2026-05-06T16:20:40.991Z"
    }
  ]
}
```

### PUT /api/admin/reports/:reportId
Update the status of a report and log admin action.

**Request:**
```json
{
  "status": "reviewed",  // pending, reviewed, actioned
  "action_taken": "User warned about policy violation"
}
```

**Response:**
```json
{
  "message": "Report updated",
  "report": {
    "report_id": 1,
    "status": "reviewed",
    "metadata": {
      "action_taken": "User warned about policy violation",
      "reviewed_by": 94
    }
  }
}
```

### GET /api/admin/documents
List all uploaded documents with filtering and sorting.

**Query Parameters:**
- `limit` (default: 50) - Number of documents to return
- `offset` (default: 0) - Pagination offset
- `type` (optional) - Filter by file type
- `startup_id` (optional) - Filter by startup
- `mentor_id` (optional) - Filter by mentor
- `sort_by` (default: `created_at`) - Sort field
- `sort_order` (default: `DESC`) - Sort direction

**Response:**
```json
{
  "documents": [
    {
      "document_id": 1,
      "startup_id": 5,
      "file_name": "pitch_deck.pdf",
      "file_type": "pdf",
      "file_size_bytes": 2048576,
      "created_at": "2026-05-06T12:00:00.000Z"
    }
  ]
}
```

### DELETE /api/admin/messages/:id
Delete a message (content moderation).

**Response:**
```json
{
  "message": "Message deleted",
  "deleted": {
    "message_id": 5,
    "content": "Offensive content...",
    "deleted_at": "2026-05-06T16:20:40.991Z"
  }
}
```

### PUT /api/admin/users/:userId/status
Update user account status.

**Request:**
```json
{
  "status": "active|pending|inactive|suspended"
}
```

**Response:**
```json
{
  "message": "User status updated",
  "user": {
    "user_id": 42,
    "status": "suspended"
  }
}
```

## Rate Limiting

- **Report submission**: 10 reports per hour per user
- **Exceeding limit**: Returns `429 Too Many Requests`

## Database Schema

### reports table
```sql
CREATE TABLE reports (
  report_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  target_id INTEGER,
  target_type VARCHAR(50),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, reviewed, actioned
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);
```

### users.status column
```sql
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
-- Values: pending, active, inactive, suspended
```

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header, except public signup/login endpoints.

## Audit Logging
All admin actions (report updates, message deletion, etc.) are logged in the `audit_logs` table for compliance and accountability.

## Error Handling

**Common Errors:**
- `400 Bad Request` - Invalid parameters or missing required fields
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions (must be Admin for admin endpoints)
- `404 Not Found` - Report/document/message not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Testing

Run the comprehensive report API test:
```bash
npm run test-reports-api
```

This tests:
- User report creation
- Retrieving user's reports
- Admin listing and filtering reports
- Admin status updates
- Rate limiting
- Document pagination
