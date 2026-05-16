# Startup Connect Backend - Controller Refactoring Roadmap

## Executive Summary

This document provides a detailed, actionable roadmap for systematically refactoring all 19 Node.js/Express controllers (10,477 lines total) from mixed business logic/data access to clean architecture:

```
Models (Data Access) → Services (Business Logic) → Controllers (HTTP Only)
```

**Status**: All analysis complete. Ready for rapid batch execution.

---

## Part 1: Complete Controller Analysis (All 20 Controllers)

### Quick Reference Table

| # | Controller | Lines | Complexity | Status | Dependencies | Est. Effort | Key Pattern |
|---|---|---|---|---|---|---|---|
| 1 | **startupController** | 642 | HIGH | ⏳ | startupModel, documentModel | LARGE | CRUD + file upload |
| 2 | **investorController** | 860 | VERY HIGH | ⏳ | investorModel, investmentModel, projectModel | LARGE | Complex queries + search |
| 3 | **mentorController** | 599 | HIGH | ⏳ | mentorModel, documentModel | LARGE | Profile + file handling |
| 4 | **userController** | 193 | MEDIUM | ⏳ | userModel, multi-role lookup | MEDIUM | Role-based profile fetch |
| 5 | **projectController** | 584 | HIGH | ⏳ | projectModel, startupModel | MEDIUM-LARGE | CRUD + ownership |
| 6 | **investmentController** | 555 | HIGH | ⏳ | investmentModel, investorModel | MEDIUM-LARGE | Workflow + notifications |
| 7 | **mentorshipController** | 442 | MEDIUM | ⏳ | mentorshipRequestModel, mentorshipSessionModel | MEDIUM | Requests + scheduling |
| 8 | **conversationController** | 84 | MEDIUM | ✅ DONE | chatService | N/A | Already delegates to service |
| 9 | **messageController** | 203 | MEDIUM | ✅ DONE | chatService | N/A | Already delegates to service |
| 10 | **notificationController** | 71 | LOW | 🟡 SIMPLE | notificationModel | SMALL | Basic CRUD + read status |
| 11 | **adminController** | 1645 | VERY HIGH | ⏳ | userModel, all role models, auditLogModel | VERY LARGE | Multi-model queries + audit |
| 12 | **transactionController** | 587 | HIGH | ✅ DONE | transactionService, chapaPaymentService | MEDIUM-LARGE | Phase 5 payments + refunds |
| 13 | **videoSessionController** | 186 | MEDIUM | ⏳ | videoSessionService (exists) | SMALL | Video session mgmt |
| 14 | **mentorshipWorkflowController** | 533 | HIGH | ⏳ | mentorshipService, mentorshipSessionModel | MEDIUM | Complex workflow |
| 15 | **mentorshipAdvancedController** | 1026 | VERY HIGH | ⏳ | mentorshipService, all models | VERY LARGE | Advanced workflows |
| 16 | **mentorshipSchedulingController** | 229 | MEDIUM | ⏳ | mentorshipSessionModel, sessionReminderService | SMALL-MEDIUM | Scheduling logic |
| 17 | **investmentWorkflowController** | 812 | VERY HIGH | ⏳ | investmentService, investmentModel, interactionModel | VERY LARGE | Complex workflows + audit |
| 18 | **projectWorkflowController** | 527 | MEDIUM | ⏳ | projectModel, startupModel | MEDIUM | Project workflow mgmt |
| 19 | **interactionController** | 577 | HIGH | ⏳ | interactionModel, all role models | MEDIUM-LARGE | Complex interaction logic |
| 20 | **authController** | 122 | LOW | ✅ DONE | authService | N/A | Already refactored |

---

## Part 2: Top 5 Controllers - Detailed Analysis

### 1. startupController (642 lines)

**Current State:**
```javascript
// ❌ ANTI-PATTERN: Raw SQL mixed with business logic
exports.getMyStartupProfile = async (req, res) => {
  const userId = req.user.user_id;
  const result = await pool.query(
    `SELECT s.*, u.user_id, u.first_name, u.last_name, u.email
     FROM startups s JOIN users u ON ...`,
    [userId]
  );
  const docs = await pool.query(`SELECT ... FROM documents WHERE startup_id = $1`);
  startup.documents = docs.rows;
  return res.status(200).json(startup);
};
```

**Endpoints Handled:**
- `GET /api/startups/profile` - getMyStartupProfile
- `POST /api/startups/profile` - createStartupProfile  
- `PUT /api/startups/profile` - updateStartupProfile
- `DELETE /api/startups/profile` - deleteStartupProfile
- `POST /api/startups/documents` - uploadDocument
- `DELETE /api/startups/documents/:docId` - deleteDocument

**SQL Queries:**
- Simple CRUD on startups table (6)
- Document queries (3)
- User join (2)

**Complexity Factors:**
- File upload handling
- Validation of multiple field types (date, number, URL)
- Document attachment management
- Multipart form data normalization

**Refactored Pattern (AFTER):**
```javascript
// ✅ CLEAN: Controllers only handle HTTP
exports.getMyStartupProfile = async (req, res) => {
  try {
    const startup = await startupService.getStartupWithDocuments(req.user.user_id);
    res.status(200).json(startup);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// Service layer
startupService.getStartupWithDocuments = async (userId) => {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) throw new NotFoundError("Startup not found");
  const docs = await documentModel.findByStartupId(startup.startup_id);
  return { ...startup, documents: docs };
};

// Model layer
startupModel.findByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT s.*, u.first_name, u.last_name, u.email FROM startups s ...`,
    [userId]
  );
  return result.rows[0] || null;
};
```

**Required Services/Models:**
- `startupModel` (already created) ✅
- `documentModel` (already created) ✅
- `startupService` (needs creation)

**Estimated Effort:** **LARGE** (3-4 hours)
- Refactor 6 endpoints
- Extract 20+ SQL queries into model
- Create 1 service with 6 methods
- Update 8 validation rules

---

### 2. investorController (860 lines)

**Current State:**
```javascript
// ❌ Multiple pool.query calls scattered throughout
exports.getMyInvestorProfile = async (req, res) => {
  const [investorResult, documentsResult] = await Promise.all([
    pool.query(`SELECT i.*, u.user_id, u.first_name, u.last_name, u.email 
               FROM investors i JOIN users u ...`),
    pool.query(`SELECT ... FROM investor_documents WHERE investor_id = ...`)
  ]);
  // Process and return
};

exports.discoverStartups = async (req, res) => {
  // 100+ lines of complex filtering queries
  const result = await pool.query(`SELECT s.* FROM startups s 
    WHERE industry IN ($1) AND business_stage IN ($2) ...`);
};
```

**Endpoints Handled (10):**
- `GET /api/investors/profile` - getMyInvestorProfile
- `POST /api/investors/profile` - createInvestorProfile
- `PUT /api/investors/profile` - updateInvestorProfile
- `GET /api/investors` - getAllInvestors
- `DELETE /api/investors/documents/:docId` - deleteInvestorDocument
- `PUT /api/investors/documents/:docId` - updateInvestorDocument
- `GET /api/investors/discover` - discoverStartups (COMPLEX)
- `GET /api/investors/:startupId/details` - getStartupDetails
- `GET /api/investors/startups/recommendations` - getStartupRecommendations
- `GET /api/investors/portfolio` - getInvestmentPortfolio

**SQL Queries:**
- Profile CRUD (5)
- Document CRUD (3)
- Complex discovery query (15+ variations)
- Portfolio aggregation (2)

**Complexity Factors:**
- **Filtering**: Multi-field search (industry, stage, funding range, location)
- **Sorting**: Multiple sort options (alphabetical, recent, rating)
- **Pagination**: Dynamic limit/offset
- **File handling**: Profile picture + portfolio documents
- **Calculations**: Portfolio metrics aggregation
- **Search recommendations**: Preference-based algorithm

**Refactored Pattern (AFTER):**
```javascript
// ✅ Controllers: HTTP only, minimal lines
exports.discoverStartups = async (req, res) => {
  try {
    const filters = investorValidation.parseDiscoveryFilters(req.query);
    const startups = await investorService.discoverStartups(
      req.user.user_id, 
      filters
    );
    res.status(200).json({ startups });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// Service layer: Business logic
investorService.discoverStartups = async (userId, filters) => {
  // Validation
  if (filters.page < 1 || filters.limit > 100) {
    throw new ValidationError("Invalid pagination");
  }
  // Fetch investor preferences
  const investor = await investorModel.findById(userId);
  if (!investor) throw new NotFoundError("Investor not found");
  
  // Call model with filters
  const startups = await startupModel.searchWithFilters({
    industries: filters.industries || investor.preferred_industry,
    stages: filters.stages,
    fundingMin: filters.funding_min,
    fundingMax: filters.funding_max,
    location: filters.location,
    sortBy: filters.sort_by,
    page: filters.page,
    limit: filters.limit
  });
  
  return startups;
};

// Model layer: Pure data access
startupModel.searchWithFilters = async (filters) => {
  const query = buildDynamicQuery(filters);
  const result = await pool.query(query.sql, query.params);
  return result.rows;
};
```

**Required Services/Models:**
- `investorModel` (already created) ✅
- `startupModel` (already created) ✅
- `documentModel` (already created) ✅
- `investorService` (needs creation)
- `investmentModel` (already created) ✅

**Estimated Effort:** **LARGE** (5-6 hours)
- Refactor 10 endpoints
- Extract 25+ SQL queries
- Create 1 service with 10 methods
- Complex filtering logic extraction
- Update 12+ validation rules

---

### 3. mentorController (599 lines)

**Current State:**
```javascript
// ❌ Raw SQL with transaction handling mixed with HTTP logic
exports.createMentorProfile = async (req, res) => {
  let client;
  const savedFilePaths = [];
  try {
    client = await pool.connect();
    
    const existing = await client.query(
      "SELECT mentor_id FROM mentors WHERE user_id = $1", [userId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "..." });
    }

    await client.query("BEGIN");
    
    const result = await client.query(
      `INSERT INTO mentors (...) VALUES (...) RETURNING *`
    );
    const mentor = result.rows[0];
    
    if (req.files) {
      // Save documents via client.query
      await saveDoc(mentor.mentor_id, req.files.cv[0], "cv");
    }
    
    await client.query("COMMIT");
    return res.status(201).json({ message: "...", mentor });
  } catch (err) {
    await client.query("ROLLBACK");
    // Cleanup files
    return res.status(500).json({ error: err.message });
  }
};
```

**Endpoints Handled (7):**
- `POST /api/mentors/profile` - createMentorProfile
- `GET /api/mentors` - getAllMentors  
- `GET /api/mentors/:id` - getMentorById
- `GET /api/mentors/profile` - getMyProfile
- `PUT /api/mentors/profile` - updateMentorProfile
- `DELETE /api/mentors/documents/:docId` - deleteMentorDocument
- `PUT /api/mentors/documents/:docId` - replaceMentorDocument

**SQL Queries:**
- Profile CRUD (6)
- Document CRUD (4)
- Verification status checks (2)

**Complexity Factors:**
- **Transaction handling** for multi-step operations
- **File management**: CV + certifications + cleanup on error
- **Verification status** filtering
- **Array parsing**: Skills, industries (comma-separated or JSON)
- **Document tracking**: Multiple document types

**Refactored Pattern (AFTER):**
```javascript
// ✅ Controllers: Simple, HTTP-focused
exports.createMentorProfile = async (req, res) => {
  try {
    const validated = await mentorValidation.validateCreate(req.body);
    const mentor = await mentorService.createProfile(
      req.user.user_id,
      validated,
      req.files
    );
    res.status(201).json({ message: "Mentor profile created", mentor });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// Service layer: Business logic & transactions
mentorService.createProfile = async (userId, validated, files) => {
  // Check existing
  const existing = await mentorModel.findByUserId(userId);
  if (existing) throw new ConflictError("Profile already exists");
  
  // Use transaction for multi-step operation
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Create mentor record
    const mentor = await mentorModel.create(client, {
      user_id: userId,
      ...validated
    });
    
    // Save documents
    if (files) {
      for (const file of files.cv || []) {
        await documentModel.createMentorDoc(client, {
          mentor_id: mentor.mentor_id,
          document_type: "cv",
          ...file
        });
      }
    }
    
    await client.query("COMMIT");
    return mentor;
  } catch (err) {
    await client.query("ROLLBACK");
    // Cleanup files
    throw err;
  } finally {
    client.release();
  }
};

// Model layer: DB operations (receives client for transactions)
mentorModel.create = async (client, data) => {
  const result = await client.query(
    `INSERT INTO mentors (...) VALUES (...) RETURNING *`,
    [data.user_id, data.headline, ...]
  );
  return result.rows[0];
};
```

**Required Services/Models:**
- `mentorModel` (already created) ✅
- `documentModel` (already created) ✅
- `mentorService` (needs creation)

**Estimated Effort:** **LARGE** (4-5 hours)
- Refactor 7 endpoints
- Extract transaction logic to service
- Move file handling to service
- Create 1 service with 7 methods
- Update 6 validation rules

---

### 4. userController (193 lines)

**Current State:**
```javascript
// ❌ Multiple role-specific queries in controller
async function getRoleProfile(userId, role) {
  if (role === "Mentor") {
    const result = await pool.query(
      "SELECT * FROM mentors WHERE user_id = $1", [userId]
    );
    return result.rows[0] || null;
  }
  if (role === "Startup") {
    const result = await pool.query(
      "SELECT * FROM startups WHERE user_id = $1", [userId]
    );
    return result.rows[0] || null;
  }
  // ...
}

exports.getMyProfile = async (req, res) => {
  const userRes = await pool.query(`SELECT ... FROM users WHERE user_id = $1`);
  const user = userRes.rows[0];
  const roleProfile = await getRoleProfile(user.user_id, user.role);
  return res.status(200).json({ user, profile: roleProfile });
};
```

**Endpoints Handled (2):**
- `GET /api/users/profile` - getMyProfile
- `PUT /api/users/profile` - updateMyProfile

**SQL Queries:**
- User CRUD (2)
- Multi-role profile lookup (3 conditional queries)

**Complexity Factors:**
- **Role polymorphism**: Different tables based on user role
- **Full name parsing**: "John Doe" → first_name: "John", last_name: "Doe"
- **Email uniqueness check**
- **Partial updates** (optional fields)

**Refactored Pattern (AFTER):**
```javascript
// ✅ Controllers: Minimal, clean
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await userService.getProfileWithRole(req.user.user_id);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// Service layer: Orchestration
userService.getProfileWithRole = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) throw new NotFoundError("User not found");
  
  // Delegate to role-specific service
  const profileFetcher = {
    Mentor: () => mentorModel.findByUserId(userId),
    Startup: () => startupModel.findByUserId(userId),
    Investor: () => investorModel.findByUserId(userId)
  }[user.role];
  
  const roleProfile = await (profileFetcher || (() => null))();
  
  return { user, profile: roleProfile };
};

// Model layer
userModel.findById = async (userId) => {
  const result = await pool.query(
    `SELECT user_id, first_name, last_name, email, role, ... FROM users WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};
```

**Required Services/Models:**
- `userModel` (already created) ✅
- `userService` (needs creation)
- Uses: mentorModel, startupModel, investorModel

**Estimated Effort:** **MEDIUM** (2-3 hours)
- Refactor 2 endpoints
- Extract 5 SQL queries
- Create 1 service with 2 methods
- Update 2 validation rules

---

### 5. projectController (584 lines)

**Current State:**
```javascript
// ❌ Direct pool.query with complex ownership checks
exports.createProject = async (req, res) => {
  const userId = req.user.user_id;
  
  // Helper function doing DB query
  const startupId = await getStartupIdForUser(userId);
  if (!startupId) {
    return res.status(404).json({ error: "No startup found" });
  }

  const {
    project_title,
    description,
    project_stage,
    budget,
    // ... 10 more fields
  } = req.body || {};
  
  // Validation of each field inline
  if (!project_title || typeof project_title !== "string") {
    return res.status(400).json({ error: "..." });
  }
  
  const result = await pool.query(
    `INSERT INTO projects (...) VALUES (...) RETURNING *`,
    [startupId, project_title, ...]
  );
  
  return res.status(201).json({ message: "...", project: result.rows[0] });
};

async function getStartupIdForUser(userId) {
  const startupResult = await pool.query(
    "SELECT startup_id FROM startups WHERE user_id = $1", [userId]
  );
  return startupResult.rowCount ? startupResult.rows[0].startup_id : null;
}
```

**Endpoints Handled (6):**
- `POST /api/projects` - createProject
- `GET /api/projects/:id` - getProjectById
- `PUT /api/projects/:id` - updateProject
- `DELETE /api/projects/:id` - deleteProject
- `GET /api/projects/startup/:startupId` - getProjectsByStartup
- `GET /api/projects` - listProjects (with pagination & filters)

**SQL Queries:**
- Project CRUD (6)
- Startup lookup (2)
- Ownership verification (2)

**Complexity Factors:**
- **Ownership verification**: User must own startup
- **Field validation**: 12+ fields with different types
- **Pagination & sorting**
- **Multi-field search** (stage, budget range, etc.)

**Refactored Pattern (AFTER):**
```javascript
// ✅ Controllers: Clean HTTP layer
exports.createProject = async (req, res) => {
  try {
    const validated = projectValidation.validateCreate(req.body);
    const project = await projectService.createProject(
      req.user.user_id,
      validated
    );
    res.status(201).json({ message: "Project created", project });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// Service layer: Business logic
projectService.createProject = async (userId, validated) => {
  // Verify user owns startup
  const startup = await startupModel.findByUserId(userId);
  if (!startup) throw new NotFoundError("Startup not found");
  
  // Create project
  const project = await projectModel.create({
    startup_id: startup.startup_id,
    ...validated
  });
  
  return project;
};

// Model layer
projectModel.create = async (data) => {
  const result = await pool.query(
    `INSERT INTO projects (startup_id, project_title, ...) 
     VALUES ($1, $2, ...) RETURNING *`,
    [data.startup_id, data.project_title, ...]
  );
  return result.rows[0];
};
```

**Required Services/Models:**
- `projectModel` (already created) ✅
- `startupModel` (already created) ✅
- `projectService` (needs creation)

**Estimated Effort:** **MEDIUM-LARGE** (3-4 hours)
- Refactor 6 endpoints
- Extract 12 SQL queries
- Create 1 service with 6 methods
- Update 8 validation rules

---

## Part 3: Batch Execution Plan

### Recommended Parallel Batches

**BATCH 1: Independent Core Profiles (Week 1, Days 1-2)**
```
Goal: Refactor basic CRUD for role profiles
Time: ~12-15 hours parallel work
Controllers: startupController, investorController, mentorController

Why Together:
- Similar patterns (profile CRUD + documents)
- Independent of each other
- Use same validation & middleware
- Can write shared utility functions

Dependencies Met:
✅ Models created (startupModel, investorModel, mentorModel, documentModel)
✅ Validations created (startup, investor, mentor)

Parallel Approach:
- Dev 1: startupController → startupService (3-4h)
- Dev 2: investorController → investorService (5-6h)  
- Dev 3: mentorController → mentorService (4-5h)
- All use shared: documentModel, documentService
```

**BATCH 2: User & Simple Profiles (Week 1, Days 3-4)**
```
Goal: Complete profile management layer
Time: ~8-10 hours
Controllers: userController, projectController, notificationController

Why Together:
- All use simple CRUD patterns
- Moderate complexity
- Independent logic
- Can test in parallel

Parallel Approach:
- Dev 1: userController → userService (2-3h)
- Dev 2: projectController → projectService (3-4h)
- Dev 3: notificationController → notificationService (2-3h)
```

**BATCH 3: Interaction & Workflows (Week 2, Days 1-2)**
```
Goal: Complex business logic refactoring
Time: ~15-18 hours
Controllers: mentorshipController, investmentController, interactionController

Why Together:
- All have business rules & workflows
- Moderate complexity (442-577 lines)
- Can test business logic in parallel

Parallel Approach:
- Dev 1: mentorshipController → mentorshipService (4-5h)
- Dev 2: investmentController → investmentService (5-6h)
- Dev 3: interactionController → interactionService (5-7h)
```

**BATCH 4: Workflow Managers (Week 2, Days 3-4)**
```
Goal: Complex workflow orchestration
Time: ~18-20 hours
Controllers: mentorshipWorkflowController, projectWorkflowController, transactionController

Why Together:
- Complex multi-step workflows
- Heavy business logic
- Similar refactoring patterns

Parallel Approach:
- Dev 1: mentorshipWorkflowController → enhanced mentorshipService (5-6h)
- Dev 2: projectWorkflowController → projectService (4-5h)
- Dev 3: transactionController → enhance transactionService (5-6h)
```

**BATCH 5: Advanced & Special Cases (Week 3, Days 1-3)**
```
Goal: Refactor largest controllers
Time: ~25-30 hours
Controllers: adminController, mentorshipAdvancedController, investmentWorkflowController

Why Together:
- Largest controllers (1645, 1026, 812 lines)
- Most complex business logic
- Heavy on aggregations & reporting
- Benefit from focused review

Parallel Approach:
- Dev 1: adminController → adminService (7-8h)
- Dev 2: mentorshipAdvancedController → advanced mentorshipService (6-7h)
- Dev 3: investmentWorkflowController → enhanced investmentService (6-8h)
```

**BATCH 6: Video, Scheduling, Remaining (Week 3, Days 4-5)**
```
Goal: Complete remaining controllers
Time: ~10-12 hours
Controllers: videoSessionController, mentorshipSchedulingController

Why Separate:
- Smaller, simpler logic
- Can be done quickly
- Less risky
- Good for junior developers

Approach:
- Dev 1: videoSessionController → enhance videoSessionService (2-3h)
- Dev 2: mentorshipSchedulingController → scheduling service (2-3h)
- Already Done: conversationController, messageController, authController ✅
```

### Timeline Summary

```
Total Estimated Effort: 88-115 hours (depending on team size)

With 3 developers in parallel:
- Batches 1-2: 5 days (both batches parallel)
- Batches 3-4: 5 days (both batches parallel)
- Batch 5: 3-4 days (all 3 controllers parallel)
- Batch 6: 2 days (final remaining)
─────────────────────
Total: 15-16 working days = 3 weeks

With 2 developers:
- Sequential batches: 6-8 weeks

With 1 developer:
- Individual controllers: 12-16 weeks
```

---

## Part 4: Before/After Pseudo-Code Examples

### Pattern 1: Simple CRUD (userController)

**BEFORE:**
```javascript
// ❌ Anti-pattern: HTTP handler mixes with DB logic
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // DB query inside controller
    const userRes = await pool.query(
      `SELECT user_id, first_name, last_name, email, role, 
              phone_number, is_active, is_approved, approved_at, created_at
       FROM users WHERE user_id = $1`,
      [userId],
    );

    if (!userRes.rowCount) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];

    // Multiple role-specific DB queries in controller
    let roleProfile = null;
    if (user.role === "Mentor") {
      const result = await pool.query(
        "SELECT * FROM mentors WHERE user_id = $1",
        [userId],
      );
      roleProfile = result.rows[0] || null;
    } else if (user.role === "Startup") {
      const result = await pool.query(
        "SELECT * FROM startups WHERE user_id = $1",
        [userId],
      );
      roleProfile = result.rows[0] || null;
    } else if (user.role === "Investor") {
      const result = await pool.query(
        "SELECT * FROM investors WHERE user_id = $1",
        [userId],
      );
      roleProfile = result.rows[0] || null;
    }

    return res.status(200).json({ user, profile: roleProfile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
```

**AFTER:**
```javascript
// ✅ Clean: Controller is pure HTTP handler
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await userService.getProfileWithRole(req.user.user_id);
    res.status(200).json(profile);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const validated = userValidation.validateUpdate(req.body);
    const updated = await userService.updateProfile(
      req.user.user_id,
      validated
    );
    res.status(200).json({ message: "Profile updated", user: updated });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
};
```

**Service Layer:**
```javascript
// src/services/userService.js
class UserService {
  async getProfileWithRole(userId) {
    const user = await userModel.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    // Delegate to role-specific model
    const roleProfile = await this.getRoleProfile(userId, user.role);

    return { user, profile: roleProfile };
  }

  async getRoleProfile(userId, role) {
    const fetchers = {
      Mentor: () => mentorModel.findByUserId(userId),
      Startup: () => startupModel.findByUserId(userId),
      Investor: () => investorModel.findByUserId(userId),
    };

    const fetcher = fetchers[role];
    return fetcher ? await fetcher() : null;
  }

  async updateProfile(userId, validated) {
    // Validation already done in controller middleware
    return await userModel.update(userId, validated);
  }
}

module.exports = new UserService();
```

**Model Layer:**
```javascript
// src/models/userModel.js
class UserModel {
  async findById(userId) {
    const result = await pool.query(
      `SELECT user_id, first_name, last_name, email, role, 
              phone_number, is_active, is_approved, approved_at, created_at
       FROM users WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  }

  async update(userId, data) {
    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone_number = $3,
           email = COALESCE($4, email)
       WHERE user_id = $5
       RETURNING user_id, first_name, last_name, email, role, 
                 phone_number, is_active, is_approved, created_at`,
      [data.first_name, data.last_name, data.phone_number, data.email, userId],
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserModel();
```

---

### Pattern 2: Complex CRUD with Files (startupController)

**BEFORE:**
```javascript
// ❌ Anti-pattern: File handling + DB + HTTP mixed
exports.createStartupProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    req.body = normalizeMultipartBody(req.body);

    // Inline validation
    let {
      startup_name,
      industry,
      description,
      business_stage,
      founded_year,
      team_size,
      location,
      website,
      funding_needed,
    } = req.body || {};

    if (!startup_name || typeof startup_name !== "string") {
      return res.status(400).json({
        error:
          "'startup_name' is required. Send either JSON (application/json) or form-data fields with startup_name.",
      });
    }

    // Inline type validation
    if (
      founded_year !== undefined &&
      founded_year !== null &&
      founded_year !== ""
    ) {
      const fy = Number(founded_year);
      if (!Number.isInteger(fy) || fy < 1900 || fy > 2100) {
        return res.status(400).json({
          error: "'founded_year' must be an integer between 1900 and 2100",
        });
      }
      founded_year = fy;
    } else {
      founded_year = null;
    }

    // ... more inline validation ...

    // Check existing in controller
    const existing = await pool.query(
      "SELECT startup_id FROM startups WHERE user_id = $1",
      [userId],
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error:
          "Startup profile already exists for this user. Use PUT /api/startups/profile to update.",
      });
    }

    // Insert in controller
    const result = await pool.query(
      `INSERT INTO startups (
        user_id, startup_name, industry, description, business_stage,
        founded_year, team_size, location, website, funding_needed
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        userId,
        startup_name,
        industry,
        description,
        business_stage,
        founded_year,
        team_size,
        location,
        website,
        funding_needed,
      ],
    );

    const startup = result.rows[0];
    const uploadedFiles = [];

    // File handling in controller
    if (req.files && typeof req.files === "object") {
      for (const fileGroup of Object.values(req.files)) {
        if (Array.isArray(fileGroup)) {
          uploadedFiles.push(...fileGroup);
        }
      }
    }

    if (req.file) {
      uploadedFiles.push(req.file);
    }

    // Persist files in controller
    for (const file of uploadedFiles) {
      try {
        await pool.query(
          `INSERT INTO documents (startup_id, file_name, file_path, file_type, file_size_bytes, created_at)
           VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)`,
          [
            startup.startup_id,
            file.originalname,
            file.path,
            file.mimetype,
            file.size,
          ],
        );
      } catch (docErr) {
        console.error("Failed to save uploaded file record:", docErr.message);
      }
    }

    res.status(201).json({ message: "Startup profile created", startup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

**AFTER:**
```javascript
// ✅ Clean architecture

// CONTROLLER: Pure HTTP handler
exports.createStartupProfile = async (req, res) => {
  try {
    const validated = startupValidation.validateCreate(req.body);
    const startup = await startupService.createProfile(
      req.user.user_id,
      validated,
      req.files || {}
    );
    res.status(201).json({
      message: "Startup profile created",
      startup,
    });
  } catch (err) {
    const status =
      err instanceof ConflictError ? 409 : err.status || 500;
    res.status(status).json({ error: err.message });
  }
};

exports.updateStartupProfile = async (req, res) => {
  try {
    const validated = startupValidation.validateUpdate(req.body);
    const startup = await startupService.updateProfile(
      req.user.user_id,
      validated,
      req.files || {}
    );
    res.status(200).json({
      message: "Startup profile updated",
      startup,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
};

exports.getMyStartupProfile = async (req, res) => {
  try {
    const startup = await startupService.getProfile(req.user.user_id);
    res.status(200).json(startup);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
```

**Service Layer:**
```javascript
// src/services/startupService.js
class StartupService {
  async createProfile(userId, validated, files) {
    // Check duplicate
    const existing = await startupModel.findByUserId(userId);
    if (existing) {
      throw new ConflictError(
        "Startup profile already exists. Use PUT to update."
      );
    }

    // Create startup
    const startup = await startupModel.create({
      user_id: userId,
      ...validated,
    });

    // Save files
    if (files && Object.keys(files).length > 0) {
      await this.saveDocuments(startup.startup_id, files);
    }

    return startup;
  }

  async updateProfile(userId, validated, files) {
    // Verify owns startup
    const startup = await startupModel.findByUserId(userId);
    if (!startup) {
      throw new NotFoundError("Startup profile not found");
    }

    // Update startup
    const updated = await startupModel.update(
      startup.startup_id,
      validated
    );

    // Update files if provided
    if (files && Object.keys(files).length > 0) {
      await this.saveDocuments(startup.startup_id, files);
    }

    return updated;
  }

  async getProfile(userId) {
    const startup = await startupModel.findByUserId(userId);
    if (!startup) {
      throw new NotFoundError("Startup profile not found");
    }

    const documents = await documentModel.findByStartupId(
      startup.startup_id
    );

    return {
      ...startup,
      documents,
    };
  }

  async saveDocuments(startupId, files) {
    const uploadedFiles = [];

    // Collect all files
    if (files && typeof files === "object") {
      for (const fileGroup of Object.values(files)) {
        if (Array.isArray(fileGroup)) {
          uploadedFiles.push(...fileGroup);
        }
      }
    }

    // Persist each file
    for (const file of uploadedFiles) {
      try {
        await documentModel.create({
          startup_id: startupId,
          file_name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size_bytes: file.size,
        });
      } catch (err) {
        // Log but don't fail - document tracking is non-critical
        console.error("Failed to save document:", err.message);
      }
    }
  }
}

module.exports = new StartupService();
```

**Model Layer:**
```javascript
// src/models/startupModel.js
class StartupModel {
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT s.*, u.user_id, u.first_name, u.last_name, u.email
       FROM startups s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.user_id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO startups (
        user_id, startup_name, industry, description, business_stage,
        founded_year, team_size, location, website, funding_needed
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        data.user_id,
        data.startup_name,
        data.industry,
        data.description,
        data.business_stage,
        data.founded_year,
        data.team_size,
        data.location,
        data.website,
        data.funding_needed,
      ],
    );
    return result.rows[0];
  }

  async update(startupId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.startup_name !== undefined) {
      updates.push(`startup_name = $${paramCount++}`);
      values.push(data.startup_name);
    }
    // ... more fields ...

    values.push(startupId);

    const result = await pool.query(
      `UPDATE startups SET ${updates.join(", ")} 
       WHERE startup_id = $${paramCount}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }
}

module.exports = new StartupModel();
```

**Validation Layer:**
```javascript
// src/validations/startup.js
const schema = {
  validateCreate: (data) => {
    const errors = [];

    // Required field
    if (!data.startup_name || typeof data.startup_name !== "string") {
      errors.push("startup_name is required");
    }

    // Optional typed fields
    if (data.founded_year !== undefined && data.founded_year !== null) {
      const fy = Number(data.founded_year);
      if (!Number.isInteger(fy) || fy < 1900 || fy > 2100) {
        errors.push("founded_year must be between 1900 and 2100");
      }
    }

    if (errors.length > 0) {
      const err = new Error("Validation failed");
      err.details = errors;
      err.status = 400;
      throw err;
    }

    // Return validated data
    return {
      startup_name: data.startup_name.trim(),
      industry: data.industry || null,
      description: data.description || null,
      business_stage: data.business_stage || null,
      founded_year: data.founded_year ? Number(data.founded_year) : null,
      team_size: data.team_size ? Number(data.team_size) : null,
      location: data.location || null,
      website: data.website || null,
      funding_needed: data.funding_needed ? Number(data.funding_needed) : null,
    };
  },

  validateUpdate: (data) => {
    // Similar to validateCreate but all fields optional
    return {
      startup_name: data.startup_name ? data.startup_name.trim() : undefined,
      industry: data.industry !== undefined ? data.industry : undefined,
      // ... other fields ...
    };
  },
};

module.exports = schema;
```

---

### Pattern 3: Complex Workflow (investmentController)

**BEFORE:**
```javascript
// ❌ Anti-pattern: Complex business logic mixed with HTTP
exports.respondToInvestmentRequest = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { request_id, action, counter_amount } = req.body || {};

    const requestIdNum = Number(request_id);
    if (!Number.isInteger(requestIdNum) || requestIdNum <= 0) {
      return res.status(400).json({ error: "request_id required" });
    }

    if (action !== "approve" && action !== "counter" && action !== "reject") {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Business logic in controller
    const result = await pool.query(
      `SELECT ir.*, p.project_title, s.startup_name, s.user_id AS startup_user_id,
              i.organization_name, i.user_id AS investor_user_id
       FROM investment_requests ir
       JOIN projects p ON p.project_id = ir.project_id
       JOIN startups s ON s.startup_id = ir.startup_id
       JOIN investors i ON i.investor_id = ir.investor_id
       WHERE ir.request_id = $1`,
      [requestIdNum],
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Request not found" });
    }

    const investmentRequest = result.rows[0];

    // Authorization check mixed with business logic
    if (
      investmentRequest.investor_user_id !== userId &&
      investmentRequest.startup_user_id !== userId
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Role check mixed with business logic
    if (investmentRequest.status !== "pending") {
      return res.status(400).json({ error: "Request already responded" });
    }

    let updateQuery;
    let updateValues;

    // Different logic paths mixed in controller
    if (action === "approve") {
      if (investmentRequest.investor_user_id !== userId) {
        return res
          .status(403)
          .json({ error: "Only investor can approve" });
      }

      updateQuery = `UPDATE investment_requests 
                     SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                     WHERE request_id = $1
                     RETURNING *`;
      updateValues = [requestIdNum];

      const approvedRes = await pool.query(updateQuery, updateValues);
      const approved = approvedRes.rows[0];

      // Create investment record
      const investmentRes = await pool.query(
        `INSERT INTO investments 
         (investor_id, project_id, amount, funded_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          investmentRequest.investor_id,
          investmentRequest.project_id,
          investmentRequest.amount,
        ],
      );

      // Send notifications
      await pool.query(
        `INSERT INTO notifications
         (user_id, notification_type, title, message)
         VALUES ($1, 'investment_approved', $2, $3)`,
        [
          investmentRequest.startup_user_id,
          `Investment Approved`,
          `Your investment request for ${investmentRequest.project_title} has been approved!`,
        ],
      );

      return res.status(200).json({
        message: "Investment approved",
        request: approved,
      });
    } else if (action === "counter") {
      // ... 50+ lines of counter offer logic ...
    } else if (action === "reject") {
      // ... 30+ lines of rejection logic ...
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
```

**AFTER:**
```javascript
// ✅ Clean: Controller is pure HTTP handler

exports.respondToInvestmentRequest = async (req, res) => {
  try {
    const validated = investmentValidation.validateResponse(req.body);
    const result = await investmentService.respondToRequest(
      req.user.user_id,
      validated
    );
    res.status(200).json({
      message: `Investment request ${validated.action}d`,
      request: result,
    });
  } catch (err) {
    const status =
      err instanceof NotFoundError
        ? 404
        : err instanceof ForbiddenError
          ? 403
          : err.status || 500;
    res.status(status).json({ error: err.message });
  }
};
```

**Service Layer:**
```javascript
// src/services/investmentService.js
class InvestmentService {
  async respondToRequest(userId, { request_id, action, counter_amount }) {
    // Fetch request
    const investmentRequest =
      await investmentModel.findRequestWithDetails(request_id);
    if (!investmentRequest) {
      throw new NotFoundError("Investment request not found");
    }

    // Verify authorization
    this.verifyAuthorization(userId, investmentRequest);

    // Verify can respond
    if (investmentRequest.status !== "pending") {
      throw new ConflictError("Request already responded");
    }

    // Delegate to action-specific handler
    const handlers = {
      approve: () => this.approveRequest(investmentRequest, userId),
      counter: () =>
        this.submitCounterOffer(investmentRequest, counter_amount, userId),
      reject: () => this.rejectRequest(investmentRequest, userId),
    };

    const handler = handlers[action];
    if (!handler) {
      throw new ValidationError("Invalid action");
    }

    return await handler();
  }

  async approveRequest(investmentRequest, userId) {
    // Only investor can approve
    if (investmentRequest.investor_user_id !== userId) {
      throw new ForbiddenError("Only investor can approve");
    }

    // Update request status
    const updated = await investmentModel.updateRequestStatus(
      investmentRequest.request_id,
      "approved"
    );

    // Create investment record
    const investment = await investmentModel.create({
      investor_id: investmentRequest.investor_id,
      project_id: investmentRequest.project_id,
      amount: investmentRequest.amount,
    });

    // Notify startup user
    await notificationService.notify(
      investmentRequest.startup_user_id,
      "investment_approved",
      "Investment Approved",
      `Investment for ${investmentRequest.project_title} approved!`
    );

    return updated;
  }

  async submitCounterOffer(investmentRequest, counter_amount, userId) {
    // Only startup can counter
    if (investmentRequest.startup_user_id !== userId) {
      throw new ForbiddenError("Only startup can submit counter offer");
    }

    if (counter_amount <= 0) {
      throw new ValidationError("Counter amount must be positive");
    }

    // Update with counter
    const updated = await investmentModel.updateRequestWithCounter(
      investmentRequest.request_id,
      {
        status: "countered",
        counter_amount,
      }
    );

    // Notify investor
    await notificationService.notify(
      investmentRequest.investor_user_id,
      "counter_offer",
      "Counter Offer Received",
      `Startup submitted counter offer of ${counter_amount}`
    );

    return updated;
  }

  async rejectRequest(investmentRequest, userId) {
    // Either side can reject
    const updated = await investmentModel.updateRequestStatus(
      investmentRequest.request_id,
      "rejected"
    );

    // Notify other party
    const notifyUserId =
      investmentRequest.investor_user_id === userId
        ? investmentRequest.startup_user_id
        : investmentRequest.investor_user_id;

    await notificationService.notify(
      notifyUserId,
      "request_rejected",
      "Request Rejected",
      "Investment request was rejected"
    );

    return updated;
  }

  verifyAuthorization(userId, investmentRequest) {
    if (
      investmentRequest.investor_user_id !== userId &&
      investmentRequest.startup_user_id !== userId
    ) {
      throw new ForbiddenError("Not authorized for this request");
    }
  }
}

module.exports = new InvestmentService();
```

**Model Layer:**
```javascript
// src/models/investmentModel.js
class InvestmentModel {
  async findRequestWithDetails(requestId) {
    const result = await pool.query(
      `SELECT ir.*, 
              p.project_title, 
              s.startup_name, s.user_id AS startup_user_id,
              i.organization_name, i.user_id AS investor_user_id
       FROM investment_requests ir
       JOIN projects p ON p.project_id = ir.project_id
       JOIN startups s ON s.startup_id = ir.startup_id
       JOIN investors i ON i.investor_id = ir.investor_id
       WHERE ir.request_id = $1`,
      [requestId],
    );
    return result.rows[0] || null;
  }

  async updateRequestStatus(requestId, status) {
    const result = await pool.query(
      `UPDATE investment_requests 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $2
       RETURNING *`,
      [status, requestId],
    );
    return result.rows[0] || null;
  }

  async updateRequestWithCounter(requestId, data) {
    const result = await pool.query(
      `UPDATE investment_requests 
       SET status = $1, counter_amount = $2, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $3
       RETURNING *`,
      [data.status, data.counter_amount, requestId],
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO investments 
       (investor_id, project_id, amount, funded_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [data.investor_id, data.project_id, data.amount],
    );
    return result.rows[0];
  }
}

module.exports = new InvestmentModel();
```

---

## Part 5: Implementation Checklist

### Per-Controller Checklist Template

```markdown
### ✓ Controller: _____________ (Lines: ___)

**Pre-Refactoring:**
- [ ] Identify all endpoints
- [ ] List all pool.query() calls
- [ ] Document authorization rules
- [ ] Document validation rules
- [ ] Identify file handling needs
- [ ] Identify transaction needs

**Service Layer:**
- [ ] Create src/services/{name}Service.js
- [ ] Extract business logic methods
- [ ] Add error handling
- [ ] Add logging (optional)
- [ ] Document service interface

**Model Layer:**
- [ ] Verify model exists
- [ ] Add missing model methods
- [ ] Add query builder helpers if complex
- [ ] Test model independently

**Controller Refactoring:**
- [ ] Update all exports
- [ ] Replace pool.query calls with service calls
- [ ] Simplify error handling
- [ ] Update response formats
- [ ] Remove inline validation

**Testing:**
- [ ] Add service unit tests
- [ ] Add model unit tests
- [ ] Test controller endpoints
- [ ] Test error scenarios
- [ ] Test authorization

**Documentation:**
- [ ] Update service docstrings
- [ ] Update API docs
- [ ] Update README if needed
```

---

## Part 6: Success Metrics

### After Refactoring Completion

**Code Quality:**
- [ ] 0 pool.query calls in controllers
- [ ] All controllers < 100 lines average
- [ ] Service layer handles all business logic
- [ ] Model layer handles all data access
- [ ] 100% of tests passing

**Coverage:**
- [ ] Unit tests for all services
- [ ] Integration tests for all endpoints
- [ ] E2E tests for critical workflows
- [ ] Target: 80%+ code coverage

**Performance:**
- [ ] No N+1 queries
- [ ] Database queries optimized
- [ ] Response times < 200ms for CRUD
- [ ] Response times < 500ms for complex queries

**Maintainability:**
- [ ] Code is DRY (no duplication)
- [ ] Clear separation of concerns
- [ ] Easy to add new features
- [ ] Easy to test
- [ ] Documentation complete

---

## Summary

**Total Controllers:** 20
**Lines to Refactor:** ~9,400 (excluding already-done: authController, conversationController, messageController)
**Estimated Timeline:** 3 weeks with 3 developers, 6-8 weeks with 2 developers
**Batch Approach:** 6 batches, parallel execution recommended
**Pattern:** Models → Services → Controllers
**Zero Breaking Changes:** All endpoints remain functional

Ready to proceed with Batch 1 (startupController, investorController, mentorController)?

