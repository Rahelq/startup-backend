# Backend Setup — StartupConnect

This document describes how to get the backend running locally and what team members should do after pulling the repository.

## Prerequisites
- Node.js v18+ and npm
- PostgreSQL (local or remote)
- Git

## Quick start (recommended)
1. Clone and checkout the branch:

```bash
git clone https://github.com/etsuamb/Startup-backend.git
cd Startup-backend/backend
git fetch origin
git checkout feat/mentor-docs
```

2. Install dependencies:

```bash
npm ci
```

3. Environment variables
- Create a `.env` file in the `backend/` folder. Example variables:

```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=startupconnect
JWT_SECRET=some_long_secret
PORT=3000
```

4. Database setup
- Option A: Run the SQL migration manually (psql):

```bash
createdb startupconnect
psql -U $DB_USER -d startupconnect -f 001_init.sql
```

- Option B: Run the included migration helper (uses `.env` settings):

```bash
node support/scripts/run_migration.js
```

5. Prepare directories and admin account

```bash
mkdir -p uploads
node support/scripts/reset_admin_password.js   # sets admin@startupconnect.test / AdminPass123!
```

6. Start the server

```bash
npm run dev   # or `node index.js`
```

7. API testing
- Import `StartupConnect Backend API.postman_collection.json` into Postman.
- Login: POST `/api/auth/login` with the admin credentials to obtain a token.
- Add header `Authorization: Bearer <token>` for admin routes.

## Notes for team
- Do not commit `.env`, `uploads/`, or `node_modules/` — they are ignored in `.gitignore`.
- If teammates prefer Docker, we can add a `docker-compose.yml` to run Postgres + app.
- For repeatable DB changes in teams, consider adopting a migration tool (Flyway, Knex, Sequelize, or node-pg-migrate).

## Useful scripts
- `node support/scripts/run_migration.js` — applies `001_init.sql` and creates `uploads/` if missing.
- `node support/scripts/reset_admin_password.js` — creates or resets the seeded admin password.
- `node support/scripts/check_postman_collection.js` — validates the Postman collection contents.
- `npm run test-mentorship-flow` — end-to-end mentorship request/session smoke test.
- `npm run test-mentorship-extras` — exercises chat, resources, payments, and admin overview paths.
- `npm run test-socket` — starts from the seeded demo users, then verifies realtime delivery, presence, typing, and unread counts.
- `npm run test-video-sessions` — exercises session creation, chat linkage, reschedule, cancel, and Zoom webhook signature verification.

## Realtime client events
Clients can listen for the socket events below after authenticating with the same JWT used for HTTP requests:

```js
socket.on("presence:init", ({ users }) => {
	console.log("pair presence", users);
});

socket.on("message:new", (message) => {
	console.log("new message", message);
});

socket.on("typing", (event) => {
	console.log("typing", event);
});

socket.on("unread:count", ({ user_id, count }) => {
	console.log("unread count", user_id, count);
});
```

Set `REDIS_URL` when you want the adapter and unread counters to use Redis across multiple app instances.

## Video sessions and Zoom

The backend now stores each scheduled meeting in `video_sessions` and links it to a chat conversation. When `ZOOM_ENABLED=true`, the server creates a Zoom meeting and stores the returned `meeting_link` and `meeting_id`.

Required Zoom env vars for live meetings:

- `ZOOM_ENABLED=true`
- `ZOOM_ACCESS_TOKEN=<server-to-server OAuth access token>` or `ZOOM_JWT_TOKEN=<legacy token>`
- `ZOOM_ACCOUNT_ID=<Zoom account id>`
- `ZOOM_CLIENT_ID=<Zoom app client id>`
- `ZOOM_CLIENT_SECRET=<Zoom app client secret>`
- `ZOOM_USER_ID=<Zoom user id or email>`
- `ZOOM_WEBHOOK_SECRET_TOKEN=<Zoom webhook secret token>`

If you only want to smoke test locally, leave `ZOOM_ENABLED=false` and run `npm run test-video-sessions`.

## Mentorship scheduling

Mentorship scheduling now uses the mentor's recurring weekly availability plus the shared video-session layer.

Useful endpoints:

- `GET /api/mentorship/availability/me` - mentor reads their availability
- `PUT /api/mentorship/availability/me` - mentor saves weekly availability slots
- `GET /api/mentorship/availability/:mentorId` - approved users read a mentor's availability
- `POST /api/mentorship/bookings` - startup books an accepted mentorship request into a real session
- `POST /api/mentorship/sessions/:sessionId/confirm` - mentor confirms a session
- `PUT /api/mentorship/sessions/:sessionId/reschedule` - either participant reschedules a booked session
- `POST /api/mentorship/sessions/:sessionId/cancel` - either participant cancels a booked session

Each booked session stores the mentor, startup, date, start/end time, duration, conversation link, and video session link. The backend also starts a lightweight reminder poller on boot and sends 24-hour and 1-hour reminders through the existing notification system.

Useful scripts:

- `npm run migrate-mentorship-scheduling` - applies the schedule schema upgrade
- `npm run test-scheduling-system` - smoke tests availability, booking, confirm, reschedule, cancel, and reminders

## Startup and investment integration endpoints

Use workflow endpoints first for new frontend integrations. Legacy endpoints remain mounted for backward compatibility.

Workflow-first routes:

- `POST /api/projects-workflow/projects` - startup creates a project
- `GET /api/projects-workflow/projects/:projectId` - approved user gets project details
- `POST /api/projects-workflow/projects/:projectId/milestones` - startup creates milestones
- `PUT /api/projects-workflow/milestones/:milestoneId` - startup updates milestone progress
- `POST /api/investment-workflow/offers` - investor/startup creates investment offer/request
- `POST /api/investment-workflow/investments/:investmentId/counter-offer` - negotiate terms
- `PUT /api/investment-workflow/investments/:investmentId/respond` - accept/reject offer
- `POST /api/investment-workflow/investments/:investmentId/payment` - record payment progress
- `POST /api/investment-workflow/investments/:investmentId/feedback` - investor submits startup feedback
- `GET /api/investment-workflow/feedback` - startup lists investor feedback
- `POST /api/mentorship-workflow/offers` - startup/mentor initiates mentorship interaction

Compatibility routes still available:

- `/api/projects/*`
- `/api/investments/*`
- `/api/mentorship/*`

Run migration scripts on existing databases:

- `npm run migrate-investment-workflow`
- `npm run migrate-mentorship-scheduling`
- `npm run migrate-video-sessions`

## Troubleshooting
- If requests fail with `Invalid URI "http:///..."`, import the Postman collection in `backend/` (it uses absolute `http://localhost:3000` URLs).
- If you see DB column errors, ensure you ran the migration SQL or the migration script against the correct database.

If you'd like, I can add a `/.env.example` file and a `docker-compose.yml` next.

## .env.example and Docker (optional, recommended)

I added `.env.example` and a minimal `docker-compose.yml` to make onboarding easier.

1. Copy the example env and edit if needed:

```bash
cp .env.example .env
# edit .env to set real DB credentials if not using Docker
```

2. Use Docker Compose to run Postgres locally (recommended):

```bash
docker-compose up -d
```

This starts a Postgres instance with:

- user: `postgres`
- password: `postgres`
- db: `startupconnect`

3. After Postgres is running, run migration and prepare the app:

```bash
npm ci
node support/scripts/run_migration.js
mkdir -p uploads
node support/scripts/reset_admin_password.js
npm run dev
```

4. Verify in Postman by importing `StartupConnect Backend API.postman_collection.json` and logging in.

---

Files added:
- `.env.example` — sample env variables
- `docker-compose.yml` — Postgres service for local development

