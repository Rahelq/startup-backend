const pool = require("../config/db");

function extractId(req, keys) {
  for (const k of keys) {
    if (req.params && req.params[k]) return req.params[k];
    if (req.body && req.body[k]) return req.body[k];
    if (req.query && req.query[k]) return req.query[k];
  }
  return null;
}

module.exports = function requireActiveRelationship(type) {
  return async (req, res, next) => {
    try {
      const userId = req.user && req.user.user_id;
      if (!userId) return res.status(401).json({ message: "Unauthenticated" });

      if (type === "mentorship") {
        const mentorshipId = extractId(req, ["mentorship_id", "mentorshipId", "mentorship_id"]);
        const mentorshipRequestId = extractId(req, [
          "mentorship_request_id",
          "mentorshipRequestId",
        ]);
        let r;
        if (mentorshipId) {
          r = await pool.query(
            `SELECT mentorship_id, mentor_id, startup_id, status
             FROM mentorship_relationships
             WHERE mentorship_id = $1 OR mentorship_request_id = $1`,
            [mentorshipId]
          );
        } else if (mentorshipRequestId) {
          r = await pool.query(
            `SELECT mentorship_id, mentor_id, startup_id, status FROM mentorship_relationships WHERE mentorship_request_id = $1`,
            [mentorshipRequestId]
          );
        } else {
          return res
            .status(400)
            .json({ message: "mentorship_id or mentorship_request_id is required" });
        }

        if (!r.rowCount)
          return res.status(404).json({ message: "Mentorship relationship not found" });
        const rel = r.rows[0];
        if (rel.status !== "active")
          return res.status(403).json({ message: "Mentorship relationship is not active" });
        if (rel.mentor_id !== userId && rel.startup_id !== userId)
          return res.status(403).json({ message: "Not a participant in this mentorship" });
        return next();
      }

      if (type === "mentorship_session") {
        const sessionId = extractId(req, ["sessionId", "mentorship_session_id", "session_id"]);
        if (!sessionId) return res.status(400).json({ message: "sessionId is required" });
        const r = await pool.query(
          `SELECT ms.*, mr.status AS relationship_status, mr.mentor_id, mr.startup_id
           FROM mentorship_sessions ms
           JOIN mentorship_relationships mr ON mr.mentorship_request_id = ms.mentorship_request_id
           WHERE ms.mentorship_session_id = $1`,
          [sessionId]
        );
        if (!r.rowCount) return res.status(404).json({ message: "Session not found" });
        const row = r.rows[0];
        if (row.relationship_status !== "active")
          return res.status(403).json({ message: "Mentorship relationship is not active" });
        if (row.mentor_id !== userId && row.startup_id !== userId)
          return res.status(403).json({ message: "Not a participant in this session" });
        return next();
      }

      if (type === "investment") {
        const investmentId = extractId(req, ["investment_id", "investmentId", "investment_id"]);
        if (!investmentId) return res.status(400).json({ message: "investment_id is required" });
        const r = await pool.query(
          `SELECT investment_id, investor_id, startup_id, status FROM investment_relationships WHERE investment_id = $1`,
          [investmentId]
        );
        if (!r.rowCount)
          return res.status(404).json({ message: "Investment relationship not found" });
        const rel = r.rows[0];
        if (rel.status !== "active" && rel.status !== "accepted")
          return res.status(403).json({ message: "Investment relationship is not active" });
        if (rel.investor_id !== userId && rel.startup_id !== userId)
          return res.status(403).json({ message: "Not a participant in this investment" });
        return next();
      }

      return res.status(400).json({ message: "Unsupported relationship type" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
