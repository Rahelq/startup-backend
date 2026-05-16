const requireActiveRelationship = require("./requireActiveRelationship");

// middleware factory
// if forQuery is true, it will read relationship_type and relationship_id from req.query
module.exports = function requireRelationshipAccess(forQuery = false) {
  return async (req, res, next) => {
    try {
      const source = forQuery ? req.query : req.body;
      const relationshipType =
        (source && source.relationship_type) || (source && source.relationshipType) || null;
      const relationshipId = (source && (source.relationship_id || source.relationshipId)) || null;
      if (!relationshipType || !relationshipId)
        return res
          .status(400)
          .json({ error: "relationship_type and relationship_id are required" });

      // ensure req.body/query exist
      req.body = req.body || {};
      req.query = req.query || {};

      // map to the expected keys for requireActiveRelationship (set in both places to be safe)
      if (relationshipType === "mentorship") {
        req.body.mentorship_id = relationshipId;
        req.body.mentorship_request_id = relationshipId;
        req.query.mentorship_id = relationshipId;
        req.query.mentorship_request_id = relationshipId;
      }
      if (relationshipType === "investment") {
        req.body.investment_id = relationshipId;
        req.query.investment_id = relationshipId;
      }

      if (relationshipType === "mentorship")
        return requireActiveRelationship("mentorship")(req, res, next);
      if (relationshipType === "investment")
        return requireActiveRelationship("investment")(req, res, next);
      return res.status(400).json({ error: "Unsupported relationship_type" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
};
