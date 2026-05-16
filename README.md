# Startup Connect Backend API

A modern, production-ready backend for the Startup Connect platform. Built with Express.js, PostgreSQL, Socket.io, and comprehensive validation, authentication, and error handling.

## 📋 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (RBAC)
- **Input Validation**: Joi schemas for all endpoints
- **Error Handling**: Centralized error handler middleware with proper logging
- **Database Layer**: Clean DAOs/models for all entities
- **Services Layer**: Business logic separated from controllers
- **Real-time**: Socket.io integration for live features
- **Testing**: Jest + Supertest for unit and integration tests
- **Docker Support**: Ready for containerized deployment
- **API Documentation**: OpenAPI/Swagger spec included
- **Code Quality**: ESLint + Prettier for linting and formatting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on v22)
- PostgreSQL 12+
- npm or yarn

### Local Development

1. **Clone and install**
```bash
cd startup-backend-clean
npm install
```

2. **Configure environment**
```bash
# Copy .env.example to .env and update credentials
cp support/other/.env.example .env
```

3. **Set up database**
```bash
# Reset and seed with demo data
npm run reset-db
npm run seed-db
```

4. **Start development server**
```bash
npm run dev  # Uses nodemon for auto-reload
```

Server runs on `http://localhost:3000` by default.

### Using Docker

```bash
# Build and start with Docker Compose
docker-compose up --build

# Server: http://localhost:3000
# Database: localhost:5432
```

## 📁 Project Structure

```
src/
├── app.js                 # Express app setup
├── server.js              # Server entry point
├── config/
│   └── db.js              # Database connection pool
├── controllers/           # HTTP request handlers
│   ├── authController.js  # Auth logic (refactored to use services)
│   ├── userController.js
│   ├── startupController.js
│   └── ...
├── routes/                # Route definitions with middleware
│   ├── authRoutes.js      # Auth endpoints with validation
│   ├── userRoutes.js
│   ├── startupRoutes.js
│   └── ...
├── models/                # Database access objects (DAOs)
│   ├── userModel.js
│   ├── startupModel.js
│   ├── investorModel.js
│   ├── mentorModel.js
│   ├── projectModel.js
│   └── ...
├── services/              # Business logic & orchestration
│   ├── authService.js     # Auth service (register, login, refresh)
│   ├── chatService.js
│   ├── notificationService.js
│   └── ...
├── middleware/            # Express middleware
│   ├── authMiddleware.js  # JWT auth & role checks
│   ├── roles.js           # Role-based access + ownership
│   ├── validate.js        # Joi validation
│   ├── errorHandler.js    # Centralized error handling
│   └── ...
├── validations/           # Joi schemas per feature
│   ├── auth.js
│   ├── startup.js
│   ├── investor.js
│   ├── mentor.js
│   ├── project.js
│   └── ...
├── utils/                 # Helper functions
│   ├── mail.js
│   ├── socket.js
│   ├── realtimeEmitter.js
│   └── ...
└── __tests__/             # Test suites
    └── auth.test.js       # Auth endpoint tests

support/
├── scripts/               # Database & data scripts
│   ├── reset_db.js
│   ├── seed_db.js
│   └── ...
├── docs/
│   ├── openapi.yml        # OpenAPI spec
│   └── ...
└── config/
    └── db.js              # Shim for scripts to access DB config

.env                       # Environment variables
.eslintrc.js              # Linting rules
.prettierrc                # Code formatting rules
Dockerfile                 # Docker image definition
docker-compose.yml         # Multi-container setup
package.json               # Dependencies & scripts
```

## 🔐 Authentication & Authorization

### How It Works

1. **Register**: `POST /api/auth/register`
   - Creates user account (pending admin approval)
   - Issues JWT access token + refresh token

2. **Login**: `POST /api/auth/login`
   - Validates credentials
   - Returns JWT + refresh token

3. **Refresh**: `POST /api/auth/refresh`
   - Exchanges refresh token for new access token

4. **Protected Routes**
   - Use `authenticate` middleware to require token
   - Use `requireRole('Admin')` to restrict by role
   - Use `requireOwnership()` for ownership checks
   - Use `requireApproval` to enforce admin approval

### Example Protected Route

```javascript
const { authenticate } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roles");

router.get(
  "/admin/users",
  authenticate,
  requireRole("Admin"),
  adminController.listUsers
);
```

## ✅ Input Validation

All routes with request bodies use Joi validation. Schemas are in `src/validations/`.

### Example

```javascript
const validate = require("../middleware/validate");
const { registerSchema } = require("../validations/auth");

router.post("/register", validate(registerSchema), authController.register);
```

Invalid input returns `400` with detailed error messages.

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode (re-run on file change)
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests use Jest + Supertest. Located in `src/__tests__/`.

## 🧹 Code Quality

```bash
# Lint code
npm run lint

# Fix lint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format
```

## 📚 API Documentation

OpenAPI spec available at [`support/docs/openapi.yml`](support/docs/openapi.yml). 

Key endpoints:
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `GET /api/users/profile` — Get user profile (auth required)
- `PUT /api/users/profile` — Update profile (auth required)
- `GET /api/startups` — List startups
- `POST /api/startups` — Create startup (auth required)
- `GET /api/investors` — List investors
- `GET /api/mentors` — List mentors
- `GET /api/projects` — List projects

See OpenAPI spec for full endpoint list.

## 🗄️ Database

Uses PostgreSQL with pg (node-postgres).

### Environment Variables

```env
DB_USER=postgres
DB_PASSWORD=123456
DB_HOST=localhost
DB_PORT=5432
DB_NAME=startup_connect
```

### Scripts

```bash
npm run reset-db      # Truncate all tables, clear uploads
npm run seed-db       # Populate demo data
npm run migrate-*     # Run specific migrations
```

## 🛠️ Architecture Highlights

### Separation of Concerns

- **Controllers**: HTTP request/response handling only
- **Services**: Business logic, transactions, orchestration
- **Models**: Database access (queries)
- **Middleware**: Auth, validation, error handling
- **Routes**: Endpoint definitions with middleware

### Error Handling

All errors pass through centralized error handler (`src/middleware/errorHandler.js`). Controllers throw errors with `err.status` and `err.message`; the handler formats and logs them.

### Validation

Every endpoint with body input uses Joi schema validation via `validate()` middleware. Schemas live in `src/validations/`.

### Real-time Features

Socket.io events broadcast via `realtimeEmitter` utility. See `src/utils/realtimeEmitter.js`.

## 📦 Dependencies

- **express**: HTTP framework
- **pg**: PostgreSQL client
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT generation/verification
- **joi**: Input validation
- **socket.io**: Real-time communication
- **nodemailer**: Email service
- **multer**: File uploads
- **axios**: HTTP client
- **dotenv**: Environment config

### Dev Dependencies

- **nodemon**: Auto-reload on file changes
- **jest**: Testing framework
- **supertest**: HTTP assertion library
- **eslint**: Linting
- **prettier**: Code formatting

## 🐳 Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build
```

Services:
- **postgres**: PostgreSQL database (port 5432)
- **app**: Node.js server (port 3000)

Environment variables are passed via `docker-compose.yml`.

For production, use the `Dockerfile` and set `NODE_ENV=production`.

## 🚨 Common Issues

**Port 3000 already in use?**
```bash
# Kill process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Database connection failed?**
```bash
# Check .env has correct DB credentials
# Ensure PostgreSQL is running
# Verify DB name exists
```

**Tests failing?**
```bash
# Ensure DB is accessible
# Run migrations first if needed
# Check NODE_ENV is not 'production'
```

## 📞 Support & Issues

For issues, check:
1. `.env` file is configured correctly
2. PostgreSQL is running
3. Port 3000 is not in use
4. All dependencies installed (`npm install`)

## 📄 License

ISC

## 📝 Notes

- JWT secret defaults to `your_secret_key` (set `JWT_SECRET` env var in production)
- Refresh tokens stored in DB with expiry (default 30 days)
- Users can login before admin approval (for profile creation); approval gates protected routes
- Demo credentials: admin@startupconnect.test / Demo123!

---

**Last Updated**: May 11, 2026  
**Version**: 1.0.0 (with models, validation, RBAC, testing, Docker, and CI/CD)
