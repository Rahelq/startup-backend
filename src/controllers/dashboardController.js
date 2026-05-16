const dashboardService = require("../services/dashboardService");

function respond(res, operation) {
  return operation()
    .then((result) => res.status(200).json(result))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
}

exports.getStartupDashboard = (req, res) =>
  respond(res, () =>
    dashboardService.getStartupDashboard(req.user.user_id, req.validatedQuery || req.query)
  );

exports.getMentorDashboard = (req, res) =>
  respond(res, () =>
    dashboardService.getMentorDashboard(req.user.user_id, req.validatedQuery || req.query)
  );

exports.getInvestorDashboard = (req, res) =>
  respond(res, () =>
    dashboardService.getInvestorDashboard(req.user.user_id, req.validatedQuery || req.query)
  );

exports.getAdminDashboard = (req, res) =>
  respond(res, () =>
    dashboardService.getAdminDashboard(req.user.user_id, req.validatedQuery || req.query)
  );
