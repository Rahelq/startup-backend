const router = require("express").Router();
const validate = require("../middleware/validate");
const {
  createProjectWorkflowSchema,
  updateProjectWorkflowStatusSchema,
  createProjectMilestoneWorkflowSchema,
  updateProjectMilestoneWorkflowSchema,
  uploadProjectDocumentWorkflowSchema,
} = require("../validations/projectWorkflow");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const projectWorkflowController = require("../controllers/projectWorkflowController");

// ============================================
// PROJECT WORKFLOW API ROUTES
// ============================================

// POST /api/projects-workflow/projects
// Create a new project
router.post(
  "/projects",
  authenticate,
  authorizeRoles("Startup"),
  validate(createProjectWorkflowSchema),
  projectWorkflowController.createProject
);

// GET /api/projects-workflow/projects/:projectId
// Get project details
router.get("/projects/:projectId", authenticate, projectWorkflowController.getProject);

// PUT /api/projects-workflow/projects/:projectId/status
// Update project status and funding stage
router.put(
  "/projects/:projectId/status",
  authenticate,
  authorizeRoles("Startup", "Admin"),
  validate(updateProjectWorkflowStatusSchema),
  projectWorkflowController.updateProjectStatus
);

// POST /api/projects-workflow/projects/:projectId/milestones
// Create project milestone
router.post(
  "/projects/:projectId/milestones",
  authenticate,
  authorizeRoles("Startup"),
  validate(createProjectMilestoneWorkflowSchema),
  projectWorkflowController.createMilestone
);

// GET /api/projects-workflow/projects/:projectId/milestones
// Get project milestones
router.get(
  "/projects/:projectId/milestones",
  authenticate,
  projectWorkflowController.getProjectMilestones
);

// PUT /api/projects-workflow/milestones/:milestoneId
// Update milestone status
router.put(
  "/milestones/:milestoneId",
  authenticate,
  authorizeRoles("Startup"),
  validate(updateProjectMilestoneWorkflowSchema),
  projectWorkflowController.updateMilestoneStatus
);

// POST /api/projects-workflow/projects/:projectId/documents
// Upload project document
router.post(
  "/projects/:projectId/documents",
  authenticate,
  authorizeRoles("Startup"),
  validate(uploadProjectDocumentWorkflowSchema),
  projectWorkflowController.uploadProjectDocument
);

// GET /api/projects-workflow/projects/:projectId/documents
// Get project documents
router.get(
  "/projects/:projectId/documents",
  authenticate,
  projectWorkflowController.getProjectDocuments
);

// GET /api/projects-workflow/my-projects
// Get startup's projects with analytics
router.get(
  "/my-projects",
  authenticate,
  authorizeRoles("Startup"),
  projectWorkflowController.getStartupProjects
);

// GET /api/projects-workflow/admin/all
// Admin view all projects
router.get(
  "/admin/all",
  authenticate,
  authorizeRoles("Admin"),
  projectWorkflowController.getAllProjects
);

// POST /api/projects-workflow/projects/:projectId/activity
router.post(
  "/projects/:projectId/activity",
  authenticate,
  authorizeRoles("Startup", "Admin"),
  projectWorkflowController.recordProjectActivity
);

// GET /api/projects-workflow/projects/:projectId/activity
router.get(
  "/projects/:projectId/activity",
  authenticate,
  authorizeRoles("Startup", "Admin"),
  projectWorkflowController.listProjectActivity
);

module.exports = router;
