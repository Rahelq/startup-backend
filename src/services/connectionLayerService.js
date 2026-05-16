const pool = require("../config/db");

const MENTORSHIP_OWNER_STATUSES = new Set(["draft", "sent", "cancelled"]);
const MENTORSHIP_COUNTERPART_STATUSES = new Set(["negotiating", "accepted", "rejected"]);
const OFFER_OWNER_STATUSES = new Set(["sent", "cancelled"]);
const OFFER_COUNTERPART_STATUSES = new Set(["negotiating", "accepted", "rejected"]);
const FUNDING_OWNER_STATUSES = new Set(["draft", "submitted", "withdrawn"]);
const FUNDING_COUNTERPART_STATUSES = new Set([
  "under_review",
  "negotiating",
  "approved",
  "rejected",
]);

function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function escapeLike(value) {
  return `%${String(value).replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

function parseJsonField(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function getDiscoveryMentors(query) {
  const { page, limit, offset } = parsePagination(query);
  const values = [limit, offset];
  const where = ["u.is_active = true", "u.is_approved = true"];

  if (query.q) {
    values.push(escapeLike(query.q));
    const idx = values.length;
    where.push(
      `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR m.headline ILIKE $${idx} OR m.expertise ILIKE $${idx})`
    );
  }

  if (query.country) {
    values.push(String(query.country));
    where.push(`m.country = $${values.length}`);
  }

  const sortMap = {
    newest: "m.created_at DESC",
    rate_asc: "m.hourly_rate ASC NULLS LAST",
    rate_desc: "m.hourly_rate DESC NULLS LAST",
    experience_desc: "m.years_experience DESC NULLS LAST",
  };
  const orderBy = sortMap[query.sort] || sortMap.newest;

  const result = await pool.query(
    `SELECT m.mentor_id, m.user_id, m.headline, m.expertise, m.years_experience, m.hourly_rate,
            m.country, m.skills, m.industries, m.profile_picture,
            u.first_name, u.last_name
     FROM mentors m
     JOIN users u ON u.user_id = m.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function getDiscoveryStartups(query) {
  const { page, limit, offset } = parsePagination(query);
  const values = [limit, offset];
  const where = ["u.is_active = true", "u.is_approved = true"];

  if (query.q) {
    values.push(escapeLike(query.q));
    const idx = values.length;
    where.push(
      `(s.startup_name ILIKE $${idx} OR s.description ILIKE $${idx} OR s.industry ILIKE $${idx})`
    );
  }

  if (query.stage) {
    values.push(String(query.stage));
    where.push(`(s.stage_type = $${values.length} OR s.business_stage = $${values.length})`);
  }

  if (query.industry) {
    values.push(String(query.industry));
    where.push(`s.industry = $${values.length}`);
  }

  const sortMap = {
    newest: "s.created_at DESC",
    funding_desc: "s.funding_needed DESC NULLS LAST",
    name_asc: "s.startup_name ASC",
  };
  const orderBy = sortMap[query.sort] || sortMap.newest;

  const result = await pool.query(
    `SELECT s.startup_id, s.user_id, s.startup_name, s.startup_tagline, s.description,
            s.industry, s.stage_type, s.business_stage, s.funding_needed, s.profile_image,
            u.first_name, u.last_name
     FROM startups s
     JOIN users u ON u.user_id = s.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function getDiscoveryInvestors(query) {
  const { page, limit, offset } = parsePagination(query);
  const values = [limit, offset];
  const where = ["u.is_active = true", "u.is_approved = true"];

  if (query.q) {
    values.push(escapeLike(query.q));
    const idx = values.length;
    where.push(
      `(i.organization_name ILIKE $${idx} OR i.firm_name ILIKE $${idx} OR i.preferred_industry ILIKE $${idx})`
    );
  }

  if (query.country) {
    values.push(String(query.country));
    where.push(`i.country = $${values.length}`);
  }

  const sortMap = {
    newest: "i.created_at DESC",
    budget_desc: "i.investment_budget DESC NULLS LAST",
  };
  const orderBy = sortMap[query.sort] || sortMap.newest;

  const result = await pool.query(
    `SELECT i.investor_id, i.user_id, i.investor_type, i.organization_name, i.firm_name,
            i.investment_budget, i.preferred_industry, i.investment_stage, i.country,
            i.profile_picture, u.first_name, u.last_name
     FROM investors i
     JOIN users u ON u.user_id = i.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function getDiscoveryProjects(query) {
  const { page, limit, offset } = parsePagination(query);
  const values = [limit, offset];
  const where = ["p.status = 'active'", "u.is_active = true", "u.is_approved = true"];

  if (query.q) {
    values.push(escapeLike(query.q));
    const idx = values.length;
    where.push(`(p.project_title ILIKE $${idx} OR p.description ILIKE $${idx})`);
  }

  if (query.startup_id) {
    values.push(Number(query.startup_id));
    where.push(`p.startup_id = $${values.length}`);
  }

  const sortMap = {
    newest: "p.created_at DESC",
    funding_goal_desc: "p.funding_goal DESC NULLS LAST",
    raised_desc: "p.amount_raised DESC NULLS LAST",
  };
  const orderBy = sortMap[query.sort] || sortMap.newest;

  const result = await pool.query(
    `SELECT p.project_id, p.startup_id, p.project_title, p.description, p.funding_goal,
            p.amount_raised, p.status, p.start_date, p.end_date,
            s.startup_name
     FROM projects p
     JOIN startups s ON s.startup_id = p.startup_id
     JOIN users u ON u.user_id = s.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function listMentorshipRelationships({ userId, status }) {
  const values = [userId];
  const where = ["(mr.mentor_id = $1 OR mr.startup_id = $1)"];

  if (status) {
    values.push(status);
    where.push(`mr.status = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT mr.*, mu.first_name AS mentor_first_name, mu.last_name AS mentor_last_name,
            su.first_name AS startup_first_name, su.last_name AS startup_last_name
     FROM mentorship_relationships mr
     JOIN users mu ON mu.user_id = mr.mentor_id
     JOIN users su ON su.user_id = mr.startup_id
     WHERE ${where.join(" AND ")}
     ORDER BY mr.updated_at DESC`,
    values
  );

  return result.rows;
}

async function listInvestmentRelationships({ userId, status }) {
  const values = [userId];
  const where = ["(ir.investor_id = $1 OR ir.startup_id = $1)"];

  if (status) {
    values.push(status);
    where.push(`ir.status = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT ir.*, iu.first_name AS investor_first_name, iu.last_name AS investor_last_name,
            su.first_name AS startup_first_name, su.last_name AS startup_last_name
     FROM investment_relationships ir
     JOIN users iu ON iu.user_id = ir.investor_id
     JOIN users su ON su.user_id = ir.startup_id
     WHERE ${where.join(" AND ")}
     ORDER BY ir.updated_at DESC`,
    values
  );

  return result.rows;
}

async function updateMentorshipRelationshipStatus({ userId, mentorshipId, status }) {
  const rel = await pool.query("SELECT * FROM mentorship_relationships WHERE mentorship_id = $1", [
    mentorshipId,
  ]);
  if (!rel.rowCount) {
    const err = new Error("Mentorship relationship not found");
    err.status = 404;
    throw err;
  }

  const relationship = rel.rows[0];
  if (relationship.mentor_id !== userId && relationship.startup_id !== userId) {
    const err = new Error("Not authorized for this mentorship relationship");
    err.status = 403;
    throw err;
  }

  const updated = await pool.query(
    `UPDATE mentorship_relationships
     SET status = $1, updated_at = NOW()
     WHERE mentorship_id = $2
     RETURNING *`,
    [status, mentorshipId]
  );

  return updated.rows[0];
}

async function updateInvestmentRelationshipStatus({ userId, investmentId, status }) {
  const rel = await pool.query("SELECT * FROM investment_relationships WHERE investment_id = $1", [
    investmentId,
  ]);
  if (!rel.rowCount) {
    const err = new Error("Investment relationship not found");
    err.status = 404;
    throw err;
  }

  const relationship = rel.rows[0];
  if (relationship.investor_id !== userId && relationship.startup_id !== userId) {
    const err = new Error("Not authorized for this investment relationship");
    err.status = 403;
    throw err;
  }

  const updated = await pool.query(
    `UPDATE investment_relationships
     SET status = $1, updated_at = NOW()
     WHERE investment_id = $2
     RETURNING *`,
    [status, investmentId]
  );

  return updated.rows[0];
}

async function createMentorshipProposal({ userId, body }) {
  const relationship = await pool.query(
    "SELECT * FROM mentorship_relationships WHERE mentorship_id = $1",
    [body.mentorship_id]
  );
  if (!relationship.rowCount) {
    const err = new Error("Mentorship relationship not found");
    err.status = 404;
    throw err;
  }

  const rel = relationship.rows[0];
  if (rel.status !== "active") {
    const err = new Error("Mentorship relationship must be active");
    err.status = 400;
    throw err;
  }
  if (rel.mentor_id !== userId) {
    const err = new Error("Only mentor can create mentorship proposals");
    err.status = 403;
    throw err;
  }

  const created = await pool.query(
    `INSERT INTO mentorship_proposals (
       mentorship_id, mentor_user_id, startup_user_id, title, proposal_text, expected_outcomes, estimated_weeks, status
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'sent')
     RETURNING *`,
    [
      body.mentorship_id,
      rel.mentor_id,
      rel.startup_id,
      body.title,
      body.proposal_text,
      JSON.stringify(parseJsonField(body.expected_outcomes)),
      body.estimated_weeks || null,
    ]
  );

  return created.rows[0];
}

async function getMentorshipProposal({ userId, mentorshipProposalId }) {
  const result = await pool.query(
    `SELECT * FROM mentorship_proposals
     WHERE mentorship_proposal_id = $1
       AND (mentor_user_id = $2 OR startup_user_id = $2)`,
    [mentorshipProposalId, userId]
  );

  if (!result.rowCount) {
    const err = new Error("Mentorship proposal not found");
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

async function updateMentorshipProposalStatus({ userId, mentorshipProposalId, status }) {
  const proposal = await getMentorshipProposal({ userId, mentorshipProposalId });

  const isOwner = proposal.mentor_user_id === userId;
  if (isOwner && !MENTORSHIP_OWNER_STATUSES.has(status)) {
    const err = new Error("Mentor can only set status to draft, sent, or cancelled");
    err.status = 403;
    throw err;
  }
  if (!isOwner && !MENTORSHIP_COUNTERPART_STATUSES.has(status)) {
    const err = new Error("Startup can only set status to negotiating, accepted, or rejected");
    err.status = 403;
    throw err;
  }

  const updated = await pool.query(
    `UPDATE mentorship_proposals
     SET status = $1, updated_at = NOW()
     WHERE mentorship_proposal_id = $2
     RETURNING *`,
    [status, mentorshipProposalId]
  );

  return updated.rows[0];
}

async function createInvestmentOffer({ userId, body }) {
  const relationship = await pool.query(
    "SELECT * FROM investment_relationships WHERE investment_id = $1",
    [body.investment_id]
  );
  if (!relationship.rowCount) {
    const err = new Error("Investment relationship not found");
    err.status = 404;
    throw err;
  }

  const rel = relationship.rows[0];
  if (!["active", "accepted", "countered"].includes(rel.status)) {
    const err = new Error("Investment relationship must be active/accepted/countered");
    err.status = 400;
    throw err;
  }
  if (rel.investor_id !== userId) {
    const err = new Error("Only investor can create investment offers");
    err.status = 403;
    throw err;
  }

  const created = await pool.query(
    `INSERT INTO investment_offers (
      investment_id, investor_user_id, startup_user_id, title, offer_text,
      funding_amount, equity_percentage, proposed_terms, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'sent')
     RETURNING *`,
    [
      body.investment_id,
      rel.investor_id,
      rel.startup_id,
      body.title,
      body.offer_text || null,
      Number(body.funding_amount),
      body.equity_percentage ?? null,
      JSON.stringify(parseJsonField(body.proposed_terms)),
    ]
  );

  return created.rows[0];
}

async function getInvestmentOffer({ userId, investmentOfferId }) {
  const result = await pool.query(
    `SELECT * FROM investment_offers
     WHERE investment_offer_id = $1
       AND (investor_user_id = $2 OR startup_user_id = $2)`,
    [investmentOfferId, userId]
  );

  if (!result.rowCount) {
    const err = new Error("Investment offer not found");
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

async function updateInvestmentOfferStatus({ userId, investmentOfferId, status }) {
  const offer = await getInvestmentOffer({ userId, investmentOfferId });
  const isOwner = offer.investor_user_id === userId;

  if (isOwner && !OFFER_OWNER_STATUSES.has(status)) {
    const err = new Error("Investor can only set status to sent or cancelled");
    err.status = 403;
    throw err;
  }
  if (!isOwner && !OFFER_COUNTERPART_STATUSES.has(status)) {
    const err = new Error("Startup can only set status to negotiating, accepted, or rejected");
    err.status = 403;
    throw err;
  }

  const updated = await pool.query(
    `UPDATE investment_offers
     SET status = $1, updated_at = NOW()
     WHERE investment_offer_id = $2
     RETURNING *`,
    [status, investmentOfferId]
  );

  return updated.rows[0];
}

async function createFundingRequest({ userId, body }) {
  const relationship = await pool.query(
    "SELECT * FROM investment_relationships WHERE investment_id = $1",
    [body.investment_id]
  );
  if (!relationship.rowCount) {
    const err = new Error("Investment relationship not found");
    err.status = 404;
    throw err;
  }

  const rel = relationship.rows[0];
  if (!["active", "accepted", "countered"].includes(rel.status)) {
    const err = new Error("Investment relationship must be active/accepted/countered");
    err.status = 400;
    throw err;
  }
  if (rel.startup_id !== userId) {
    const err = new Error("Only startup can create funding requests");
    err.status = 403;
    throw err;
  }

  const startupProfile = await pool.query("SELECT startup_id FROM startups WHERE user_id = $1", [
    userId,
  ]);
  const startupId = startupProfile.rowCount ? startupProfile.rows[0].startup_id : null;
  if (!startupId) {
    const err = new Error("Startup profile not found");
    err.status = 404;
    throw err;
  }

  if (body.project_id) {
    const project = await pool.query(
      "SELECT project_id FROM projects WHERE project_id = $1 AND startup_id = $2",
      [body.project_id, startupId]
    );
    if (!project.rowCount) {
      const err = new Error("Project not found for this startup");
      err.status = 404;
      throw err;
    }
  }

  const created = await pool.query(
    `INSERT INTO funding_requests (
      investment_id, startup_user_id, investor_user_id, project_id,
      title, request_text, amount_requested, use_of_funds, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'submitted')
    RETURNING *`,
    [
      body.investment_id,
      userId,
      rel.investor_id,
      body.project_id || null,
      body.title,
      body.request_text || null,
      Number(body.amount_requested),
      JSON.stringify(parseJsonField(body.use_of_funds)),
    ]
  );

  return created.rows[0];
}

async function getFundingRequest({ userId, fundingRequestId }) {
  const result = await pool.query(
    `SELECT * FROM funding_requests
     WHERE funding_request_id = $1
       AND (startup_user_id = $2 OR investor_user_id = $2)`,
    [fundingRequestId, userId]
  );

  if (!result.rowCount) {
    const err = new Error("Funding request not found");
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

async function updateFundingRequestStatus({ userId, fundingRequestId, status }) {
  const fundingRequest = await getFundingRequest({ userId, fundingRequestId });
  const isOwner = fundingRequest.startup_user_id === userId;

  if (isOwner && !FUNDING_OWNER_STATUSES.has(status)) {
    const err = new Error("Startup can only set status to draft, submitted, or withdrawn");
    err.status = 403;
    throw err;
  }
  if (!isOwner && !FUNDING_COUNTERPART_STATUSES.has(status)) {
    const err = new Error(
      "Investor can only set status to under_review, negotiating, approved, or rejected"
    );
    err.status = 403;
    throw err;
  }

  const updated = await pool.query(
    `UPDATE funding_requests
     SET status = $1, updated_at = NOW()
     WHERE funding_request_id = $2
     RETURNING *`,
    [status, fundingRequestId]
  );

  return updated.rows[0];
}

async function assertNegotiationParentAccess({ userId, parentType, parentId }) {
  if (parentType === "mentorship_proposal") {
    await getMentorshipProposal({ userId, mentorshipProposalId: parentId });
    return;
  }
  if (parentType === "investment_offer") {
    await getInvestmentOffer({ userId, investmentOfferId: parentId });
    return;
  }
  if (parentType === "funding_request") {
    await getFundingRequest({ userId, fundingRequestId: parentId });
    return;
  }

  const err = new Error("Invalid negotiation parent type");
  err.status = 400;
  throw err;
}

async function createNegotiation({ userId, body }) {
  await assertNegotiationParentAccess({
    userId,
    parentType: body.parent_type,
    parentId: body.parent_id,
  });

  const created = await pool.query(
    `INSERT INTO negotiations (parent_type, parent_id, sender_user_id, message, revision_data)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [
      body.parent_type,
      body.parent_id,
      userId,
      body.message,
      JSON.stringify(parseJsonField(body.revision_data)),
    ]
  );

  return created.rows[0];
}

async function listNegotiations({ userId, parentType, parentId }) {
  await assertNegotiationParentAccess({ userId, parentType, parentId });

  const result = await pool.query(
    `SELECT n.*, u.first_name, u.last_name
     FROM negotiations n
     JOIN users u ON u.user_id = n.sender_user_id
     WHERE n.parent_type = $1 AND n.parent_id = $2
     ORDER BY n.created_at ASC`,
    [parentType, parentId]
  );

  return result.rows;
}

module.exports = {
  getDiscoveryMentors,
  getDiscoveryStartups,
  getDiscoveryInvestors,
  getDiscoveryProjects,
  listMentorshipRelationships,
  listInvestmentRelationships,
  updateMentorshipRelationshipStatus,
  updateInvestmentRelationshipStatus,
  createMentorshipProposal,
  getMentorshipProposal,
  updateMentorshipProposalStatus,
  createInvestmentOffer,
  getInvestmentOffer,
  updateInvestmentOfferStatus,
  createFundingRequest,
  getFundingRequest,
  updateFundingRequestStatus,
  createNegotiation,
  listNegotiations,
};
