const router = require("express").Router();

router.use(require("./admin/adminUsersRoutes"));
router.use(require("./admin/adminProfileRoutes"));
router.use(require("./admin/adminContentRoutes"));
router.use(require("./admin/adminInvestmentRoutes"));
router.use(require("./admin/adminMentorshipRoutes"));
router.use(require("./admin/adminReportsRoutes"));
router.use("/ratings", require("./admin/adminRatingsRoutes"));
router.use(require("./admin/adminMaintenanceRoutes"));

module.exports = router;

// {"email":"admin@startupconnect.test","password":"Demo123!"}
