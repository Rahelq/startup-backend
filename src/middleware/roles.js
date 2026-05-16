const { authorizeRoles } = require("./authMiddleware");

// Wrapper for clarity: requireRole('Admin') etc.
function requireRole(role) {
	return authorizeRoles(role);
}

// Ownership check middleware generator
function requireOwnership(getResourceUserId) {
	return async (req, res, next) => {
		try {
			const resourceUserId = await getResourceUserId(req);
			if (!resourceUserId)
				return res.status(404).json({ message: "Resource not found" });
			if (
				String(resourceUserId) !== String(req.user.user_id) &&
				req.user.role !== "Admin"
			) {
				return res.status(403).json({ message: "Access denied" });
			}
			next();
		} catch (err) {
			next(err);
		}
	};
}

module.exports = { requireRole, requireOwnership };
