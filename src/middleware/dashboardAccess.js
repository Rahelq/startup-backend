function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

function requireDashboardAccess(allowedRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    if (normalizeRole(req.user.role) !== normalizeRole(allowedRole)) {
      return res.status(403).json({ message: "Access denied for this dashboard" });
    }
    return next();
  };
}

function requireRoleDashboard(...allowedRoles) {
  const allowed = allowedRoles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    if (!allowed.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: "Access denied for this dashboard" });
    }
    return next();
  };
}

function requireAnalyticsPermission(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthenticated" });
  }
  if (normalizeRole(req.user.role) !== "admin") {
    return res.status(403).json({ message: "Analytics access denied" });
  }
  return next();
}

module.exports = {
  requireDashboardAccess,
  requireRoleDashboard,
  requireAnalyticsPermission,
};
