const activityFeedService = require("../services/activityFeedService");

async function run(res, operation) {
  try {
    const result = await operation();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

exports.getFeed = async (req, res) =>
  run(res, () =>
    activityFeedService.getFeed({
      userId: req.user.user_id,
      role: req.user.role,
      ...(req.validatedQuery || req.query),
    })
  );

exports.getSummary = async (req, res) =>
  run(res, () =>
    activityFeedService.getSummary({
      userId: req.user.user_id,
      role: req.user.role,
    })
  );
