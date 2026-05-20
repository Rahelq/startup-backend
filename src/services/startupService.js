const pool = require("../config/db");
const startupModel = require("../models/startupModel");
const documentModel = require("../models/documentModel");
const documentUploadService = require("./documentUploadService");
const cloudinarySvc = require("./cloudinaryService");

function cloudinaryResourceType(doc) {
  const mime = doc.mime_type || "";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "raw";
}

async function deleteExistingDocumentsOfType(userId, startupId, documentType, keepIds = []) {
  const keep = new Set(keepIds.filter(Boolean));
  const existing = await documentModel.findByUserContextAndType(
    userId,
    "startup_profile",
    startupId,
    documentType
  );

  for (const doc of existing) {
    if (keep.has(doc.document_id)) continue;
    if (doc.public_id) {
      await cloudinarySvc.deleteByPublicId(doc.public_id, cloudinaryResourceType(doc));
    }
    await documentModel.deleteById(doc.document_id);
  }
}

async function persistStartupDocuments(userId, startupId, filesByField, options = {}) {
  if (!filesByField || typeof filesByField !== "object") return;
  const replaceExisting = !!options.replaceExisting;
  let anyBuffer = false;
  for (const v of Object.values(filesByField)) {
    const arr = Array.isArray(v) ? v : [v];
    if (arr.some((f) => f?.buffer?.length)) anyBuffer = true;
  }
  if (!anyBuffer) return;
  if (!cloudinarySvc.isConfigured()) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
    err.status = 503;
    throw err;
  }
  for (const [field, v] of Object.entries(filesByField)) {
    const arr = Array.isArray(v) ? v : [v];
    const saved = [];
    for (const file of arr) {
      if (!file?.buffer) continue;
      const doc = await documentUploadService.saveUploadedFile(file, {
        userId,
        startupId,
        documentType: field,
        contextType: "startup_profile",
        contextId: startupId,
      });
      saved.push(doc);
      if (field === "pitch_deck" && doc.file_url) {
        await startupModel.update(startupId, { pitch_deck_url: doc.file_url });
      }
      if ((field === "profile_image" || field === "logo") && doc.file_url) {
        await startupModel.update(startupId, { profile_image: doc.file_url });
      }
    }
    if (replaceExisting && saved.length) {
      await deleteExistingDocumentsOfType(
        userId,
        startupId,
        field,
        saved.map((doc) => doc.document_id)
      );
    }
  }
}

// Create startup profile
exports.createStartupProfile = async (userId, startupData, uploadedFiles = {}) => {
  const existing = await startupModel.findByUserId(userId);
  if (existing) {
    throw { status: 409, message: "Startup profile already exists for this user" };
  }

  const startup = await startupModel.create({
    user_id: userId,
    ...startupData,
  });

  try {
    await persistStartupDocuments(userId, startup.startup_id, uploadedFiles);
  } catch (err) {
    console.error("Startup document upload failed:", err.message || err);
    if (err.status === 503 || err.status === 400) throw err;
  }

  return exports.getStartupProfile(userId);
};

// Get startup profile with documents
exports.getStartupProfile = async (userId) => {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) {
    throw { status: 404, message: "Startup profile not found" };
  }

  const byStartup = await documentModel.findByStartupId(startup.startup_id);
  const byUser = await documentModel.findByUserAndContext(
    userId,
    "startup_profile",
    startup.startup_id
  );
  const merged = [...byUser];
  for (const d of byStartup) {
    if (!merged.some((m) => m.document_id === d.document_id)) merged.push(d);
  }
  startup.documents = merged;

  return startup;
};

// Update startup profile
exports.updateStartupProfile = async (userId, updates, uploadedFiles = {}) => {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) {
    throw { status: 404, message: "Startup profile not found" };
  }

  await startupModel.update(startup.startup_id, updates);

  try {
    await persistStartupDocuments(userId, startup.startup_id, uploadedFiles, {
      replaceExisting: true,
    });
  } catch (err) {
    console.error("Startup document upload failed:", err.message || err);
    if (err.status === 503 || err.status === 400) throw err;
  }

  return exports.getStartupProfile(userId);
};

// Search investors and mentors
exports.searchInvestorsAndMentors = async (filters) => {
  const { q, industry, stage, country, type = "all", limit = 50, offset = 0 } = filters;

  const maxLimit = Math.min(Number(limit) || 50, 100);
  const startOffset = Number(offset) || 0;
  const payload = {};

  const userOk = "u.is_active = true AND u.is_approved = true";

  if (type === "all" || type === "investors") {
    const queryFilters = [userOk];
    const values = [];

    if (q) {
      values.push(`%${q}%`);
      queryFilters.push(
        `(i.organization_name ILIKE $${values.length} OR i.firm_name ILIKE $${values.length} OR u.first_name ILIKE $${values.length} OR u.last_name ILIKE $${values.length})`
      );
    }
    if (industry) {
      values.push(`%${industry}%`);
      queryFilters.push(`i.preferred_industry ILIKE $${values.length}`);
    }
    if (stage) {
      values.push(`%${stage}%`);
      queryFilters.push(`i.investment_stage ILIKE $${values.length}`);
    }
    if (country) {
      values.push(`%${country}%`);
      queryFilters.push(`i.country ILIKE $${values.length}`);
    }

    values.push(maxLimit, startOffset);

    const result = await pool.query(
      `SELECT i.*, u.user_id, u.first_name, u.last_name, u.email
			 FROM investors i
			 JOIN users u ON u.user_id = i.user_id
			 WHERE ${queryFilters.join(" AND ")}
			 ORDER BY i.created_at DESC
			 LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    payload.investors = result.rows;
  }

  if (type === "all" || type === "mentors") {
    const queryFilters = [userOk, "m.verification_status = 'approved'"];
    const values = [];

    if (q) {
      values.push(`%${q}%`);
      queryFilters.push(
        `(m.headline ILIKE $${values.length} OR m.expertise ILIKE $${values.length} OR u.first_name ILIKE $${values.length} OR u.last_name ILIKE $${values.length})`
      );
    }
    if (industry) {
      values.push(`%${industry}%`);
      queryFilters.push(
        `(m.expertise ILIKE $${values.length} OR m.industries::text ILIKE $${values.length})`
      );
    }
    if (country) {
      values.push(`%${country}%`);
      queryFilters.push(`m.country ILIKE $${values.length}`);
    }

    values.push(maxLimit, startOffset);

    const result = await pool.query(
      `SELECT m.*, u.user_id, u.first_name, u.last_name, u.email
			 FROM mentors m
			 JOIN users u ON u.user_id = m.user_id
			 WHERE ${queryFilters.join(" AND ")}
			 ORDER BY m.created_at DESC
			 LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    payload.mentors = result.rows;
  }

  return payload;
};

// Get recommendations for startup
exports.getRecommendations = async (userId) => {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) {
    throw { status: 404, message: "Startup profile not found" };
  }

  const userOk = "u.is_active = true AND u.is_approved = true";

  const [investorResult, mentorResult] = await Promise.all([
    pool.query(
      `SELECT i.*, u.first_name, u.last_name, u.email,
					(CASE WHEN i.preferred_industry IS NOT NULL AND $1::text IS NOT NULL 
						  AND i.preferred_industry ILIKE '%' || $1 || '%' THEN 45 ELSE 0 END
					 + CASE WHEN i.investment_stage IS NOT NULL AND $2::text IS NOT NULL 
						  AND i.investment_stage ILIKE '%' || $2 || '%' THEN 30 ELSE 0 END
					 + CASE WHEN i.investment_budget IS NOT NULL AND $3::numeric IS NOT NULL 
						  AND i.investment_budget >= $3 THEN 25 ELSE 0 END) AS match_score
			 FROM investors i
			 JOIN users u ON u.user_id = i.user_id
			 WHERE ${userOk}
			 ORDER BY match_score DESC, i.created_at DESC
			 LIMIT 20`,
      [startup.industry, startup.business_stage, startup.funding_needed]
    ),
    pool.query(
      `SELECT m.*, u.first_name, u.last_name, u.email,
					(CASE WHEN $1::text IS NOT NULL AND (m.expertise ILIKE '%' || $1 || '%' 
					      OR m.industries::text ILIKE '%' || $1 || '%') THEN 60 ELSE 0 END
					 + CASE WHEN $2::text IS NOT NULL AND m.country ILIKE '%' || $2 || '%' THEN 15 ELSE 0 END
					 + CASE WHEN m.years_experience >= 3 THEN 25 ELSE 0 END) AS match_score
			 FROM mentors m
			 JOIN users u ON u.user_id = m.user_id
			 WHERE ${userOk} AND m.verification_status = 'approved'
			 ORDER BY match_score DESC, m.created_at DESC
			 LIMIT 20`,
      [startup.industry, startup.location]
    ),
  ]);

  return {
    method: "rule_based_profile_match",
    investors: investorResult.rows,
    mentors: mentorResult.rows,
  };
};

// Get startup dashboard status
exports.getDashboardStatus = async (userId) => {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) {
    throw { status: 404, message: "Startup profile not found" };
  }

  const [projects, investments, mentorship, payments, feedback] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount_raised),0) AS amount_raised
			 FROM projects WHERE startup_id = $1 GROUP BY status`,
      [startup.startup_id]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
			 FROM investment_requests WHERE startup_id = $1 GROUP BY status`,
      [startup.startup_id]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
			 FROM mentorship_requests WHERE startup_id = $1 GROUP BY status`,
      [startup.startup_id]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
			 FROM payments
			 WHERE receiver_id = $1
			 GROUP BY status`,
      [startup.user_id]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0) AS avg_rating
			 FROM reviews WHERE startup_id = $1`,
      [startup.startup_id]
    ),
  ]);

  return {
    projects: projects.rows,
    investments: investments.rows,
    mentorship: mentorship.rows,
    payments: payments.rows,
    feedback: feedback.rows[0],
  };
};
