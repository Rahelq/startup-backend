const router = require("express").Router();
const validate = require("../../middleware/validate");
const {
  updateAdminInvestmentRequestStatusSchema,
  updateAdminProjectStatusSchema,
} = require("../../validations/admin");

const { authenticate, authorizeRoles } = require("../../middleware/authMiddleware");
const adminService = require("../../services/adminService");

function run(res, operation) {
  return operation()
    .then((result) => res.status(result.status || 200).json(result.data))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
}

router.get("/projects", authenticate, authorizeRoles("Admin"), (req, res) =>
  run(res, () => adminService.listProjects({ query: req.query }))
);

router.get("/investment-requests", authenticate, authorizeRoles("Admin"), (req, res) =>
  run(res, () => adminService.adminListInvestmentRequests())
);

router.put(
  "/investment-requests/:id/status",
  authenticate,
  authorizeRoles("Admin"),
  validate(updateAdminInvestmentRequestStatusSchema),
  (req, res) =>
    run(res, () =>
      adminService.updateInvestmentRequestStatus({
        id: req.params.id,
        body: req.body,
        userId: req.user.user_id,
      })
    )
);

router.get("/investments", authenticate, authorizeRoles("Admin"), (req, res) =>
  run(res, () => adminService.listInvestments({ query: req.query }))
);

router.put(
  "/projects/:projectId/status",
  authenticate,
  authorizeRoles("Admin"),
  validate(updateAdminProjectStatusSchema),
  (req, res) =>
    run(res, () =>
      adminService.updateProjectStatus({
        projectId: req.params.projectId,
        body: req.body,
        userId: req.user.user_id,
      })
    )
);

router.get("/sessions", authenticate, authorizeRoles("Admin"), (req, res) =>
  run(res, () => adminService.listSessions({ query: req.query }))
);

router.get("/payments", authenticate, authorizeRoles("Admin"), (req, res) =>
  run(res, () => adminService.listPayments({ query: req.query }))
);

module.exports = router;
