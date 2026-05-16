module.exports = function requireOwnership(paramName = "id") {
  return (req, res, next) => {
    const authId = req.user && req.user.user_id;
    const target = Number(req.params[paramName] || req.body.user_id || req.query.user_id);
    if (!authId || !target || authId !== target)
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
};
