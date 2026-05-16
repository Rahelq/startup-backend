module.exports = function requireRecentPasswordConfirmation(req, res, next) {
  // For now, require a header set by frontend after password reconfirmation
  if (req.headers["x-password-confirmed"] === "1") return next();
  return res.status(403).json({ message: "Password reconfirmation required" });
};
