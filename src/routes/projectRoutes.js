const router = require("express").Router();

const validate = require("../middleware/validate");
const { projectCreateSchema, projectUpdateSchema } = require("../validations/project");

const { authenticate, authorizeRoles, requireApproval } = require("../middleware/authMiddleware");

const projectController = require("../controllers/projectController");
const upload = require("../middleware/multerMemory");

router.post(
  "/create",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  validate(projectCreateSchema),
  projectController.createProject
);

router.get(
  "/mine",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  projectController.getMyProjects
);

router.get("/all", authenticate, requireApproval, projectController.getAllProjects);

router.post(
  "/:projectId/documents",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  upload.single("file"),
  projectController.uploadProjectDocument
);

router.get(
  "/:projectId/documents",
  authenticate,
  requireApproval,
  projectController.listProjectDocuments
);

router.post(
  "/:projectId/milestones",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  projectController.createProjectMilestone
);

router.get(
  "/:projectId/milestones",
  authenticate,
  requireApproval,
  projectController.listProjectMilestones
);

router.put(
  "/milestones/:milestoneId",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  projectController.updateProjectMilestone
);

router.get("/:projectId", authenticate, requireApproval, projectController.getProjectById);

router.put(
  "/:projectId",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  validate(projectUpdateSchema),
  projectController.updateMyProject
);

module.exports = router;
