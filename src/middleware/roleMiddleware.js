/**
 * Role-based access control (alias for architecture docs).
 * Same behavior as `authorizeRoles` in authMiddleware.
 */
const { authorizeRoles } = require("./authMiddleware");

const roleMiddleware = (...roles) => authorizeRoles(...roles);

module.exports = { roleMiddleware, authorizeRoles };
