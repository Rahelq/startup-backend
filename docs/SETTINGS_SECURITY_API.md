# Settings & Security API (Phase 8)

This document summarizes the key endpoints introduced or extended as part of Phase 8 (Settings & Security).

Endpoints

- GET /api/settings — Get user settings (returns `user_settings` + merged fields)
- PUT /api/settings — Upsert user settings. Body: partial `settings` fields (timezone, language, theme, etc.)

- GET /api/settings/privacy — Get privacy settings
- PUT /api/settings/privacy — Upsert privacy settings. Body: fields from `privacy` schema (profile_visibility, show_email, ...)

- GET /api/settings/notifications/preferences — Get notification preferences (normalized shape: `channels`, `preferences`)
- PUT /api/settings/notifications/preferences — Upsert notification preferences. Accepts either legacy column names or payload like `{ channels: {...}, preferences: { digest } }`

- GET /api/devices — List user's registered devices
- DELETE /api/devices/:id — Remove a device
- POST /api/devices/:id/trust — Trust/untrust a device (payload: `{ is_trusted: true }`)

- POST /api/twofactor/setup/qr — Generate QR setup for TOTP 2FA (requires user auth)
- POST /api/twofactor/redeem-backup — Redeem a backup code

- GET /api/admin/security/analytics — Admin-only security aggregates (login attempts, suspicious devices, recent security events)

Notes

- Many endpoints use existing JWT auth and `roleMiddleware` for admin routes.
- Notification preferences endpoint accepts both legacy boolean-column schemas and a JSON shape; the server will map available columns when present.
- Deploy: ensure Phase 8 migration is applied and `REDIS_URL` configured for Redis-backed rate limiting.
