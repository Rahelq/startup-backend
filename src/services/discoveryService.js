const pool = require("../config/db");

function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function escapeLike(value) {
  return `%${String(value).replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

function rankingOrder(sort, fallback) {
  const map = {
    newest: fallback,
    trending:
      "activity_count DESC NULLS LAST, profile_score DESC NULLS LAST, last_activity_at DESC NULLS LAST, base_order DESC",
    recently_active:
      "last_activity_at DESC NULLS LAST, profile_score DESC NULLS LAST, base_order DESC",
    recommended: "profile_score DESC NULLS LAST, activity_count DESC NULLS LAST, base_order DESC",
    active: "activity_count DESC NULLS LAST, base_order DESC",
  };
  return map[sort] || fallback;
}

async function mentorDiscovery(query) {
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

  if (query.expertise) {
    values.push(escapeLike(query.expertise));
    where.push(
      `(m.expertise ILIKE $${values.length} OR m.industries::text ILIKE $${values.length})`
    );
  }

  const orderBy = rankingOrder(query.sort, "m.created_at DESC");
  const result = await pool.query(
    `SELECT m.mentor_id, m.user_id, m.headline, m.expertise, m.years_experience, m.hourly_rate,
			m.country, m.skills, m.industries, m.profile_picture,
			u.first_name, u.last_name,
			COALESCE(a.activity_count, 0)::int AS activity_count,
			COALESCE(a.last_activity_at, m.created_at) AS last_activity_at,
			(
				(CASE WHEN m.headline IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN m.expertise IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN m.years_experience IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN m.country IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN m.skills IS NOT NULL THEN 1 ELSE 0 END)
			) AS profile_score,
			ROW_NUMBER() OVER (ORDER BY m.created_at DESC) AS base_order
		 FROM mentors m
		 JOIN users u ON u.user_id = m.user_id
		 LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS activity_count, MAX(created_at) AS last_activity_at
			FROM activity_logs al
			WHERE al.user_id = u.user_id
		 ) a ON true
		 WHERE ${where.join(" AND ")}
		 ORDER BY ${orderBy}
		 LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function startupDiscovery(query) {
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

  const orderBy = rankingOrder(query.sort, "s.created_at DESC");
  const result = await pool.query(
    `SELECT s.startup_id, s.user_id, s.startup_name, s.startup_tagline, s.description,
			s.industry, s.stage_type, s.business_stage, s.funding_needed, s.profile_image,
			u.first_name, u.last_name,
			COALESCE(a.activity_count, 0)::int AS activity_count,
			COALESCE(a.last_activity_at, s.created_at) AS last_activity_at,
			(
				(CASE WHEN s.startup_name IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN s.industry IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN s.business_stage IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN s.funding_needed IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN s.description IS NOT NULL THEN 1 ELSE 0 END)
			) AS profile_score,
			ROW_NUMBER() OVER (ORDER BY s.created_at DESC) AS base_order
		 FROM startups s
		 JOIN users u ON u.user_id = s.user_id
		 LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS activity_count, MAX(created_at) AS last_activity_at
			FROM activity_logs al
			WHERE al.user_id = u.user_id
		 ) a ON true
		 WHERE ${where.join(" AND ")}
		 ORDER BY ${orderBy}
		 LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function investorDiscovery(query) {
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

  const orderBy = rankingOrder(query.sort, "i.created_at DESC");
  const result = await pool.query(
    `SELECT i.investor_id, i.user_id, i.investor_type, i.organization_name, i.firm_name,
			i.investment_budget, i.preferred_industry, i.investment_stage, i.country,
			i.profile_picture, u.first_name, u.last_name,
			COALESCE(a.activity_count, 0)::int AS activity_count,
			COALESCE(a.last_activity_at, i.created_at) AS last_activity_at,
			(
				(CASE WHEN i.organization_name IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN i.preferred_industry IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN i.investment_stage IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN i.country IS NOT NULL THEN 1 ELSE 0 END)
				+ (CASE WHEN i.investment_budget IS NOT NULL THEN 1 ELSE 0 END)
			) AS profile_score,
			ROW_NUMBER() OVER (ORDER BY i.created_at DESC) AS base_order
		 FROM investors i
		 JOIN users u ON u.user_id = i.user_id
		 LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS activity_count, MAX(created_at) AS last_activity_at
			FROM activity_logs al
			WHERE al.user_id = u.user_id
		 ) a ON true
		 WHERE ${where.join(" AND ")}
		 ORDER BY ${orderBy}
		 LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

async function projectDiscovery(query) {
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

  const orderBy = rankingOrder(query.sort, "p.created_at DESC");
  const result = await pool.query(
    `SELECT p.project_id, p.startup_id, p.project_title, p.description, p.funding_goal,
			p.amount_raised, p.status, p.start_date, p.end_date,
			s.startup_name,
			COALESCE(a.activity_count, 0)::int AS activity_count,
			COALESCE(a.last_activity_at, p.created_at) AS last_activity_at,
			((CASE WHEN p.project_title IS NOT NULL THEN 1 ELSE 0 END)
			 + (CASE WHEN p.description IS NOT NULL THEN 1 ELSE 0 END)
			 + (CASE WHEN p.funding_goal IS NOT NULL THEN 1 ELSE 0 END)) AS profile_score,
			ROW_NUMBER() OVER (ORDER BY p.created_at DESC) AS base_order
		 FROM projects p
		 JOIN startups s ON s.startup_id = p.startup_id
		 JOIN users u ON u.user_id = s.user_id
		 LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS activity_count, MAX(created_at) AS last_activity_at
			FROM project_activity_logs pal
			WHERE pal.project_id = p.project_id
		 ) a ON true
		 WHERE ${where.join(" AND ")}
		 ORDER BY ${orderBy}
		 LIMIT $1 OFFSET $2`,
    values
  );

  return { page, limit, items: result.rows };
}

module.exports = {
  getDiscoveryMentors: mentorDiscovery,
  getDiscoveryStartups: startupDiscovery,
  getDiscoveryInvestors: investorDiscovery,
  getDiscoveryProjects: projectDiscovery,
};
