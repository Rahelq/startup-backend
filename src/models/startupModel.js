const pool = require("../config/db");

async function findById(startupId) {
	const res = await pool.query("SELECT * FROM startups WHERE startup_id = $1", [startupId]);
	return res.rows[0] || null;
}

async function findByIdWithUser(startupId) {
	const res = await pool.query(
		`SELECT s.*, u.user_id, u.first_name, u.last_name, u.email
     FROM startups s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.startup_id = $1`,
		[startupId],
	);
	return res.rows[0] || null;
}

async function findByUserId(userId) {
	const res = await pool.query("SELECT * FROM startups WHERE user_id = $1", [userId]);
	return res.rows[0] || null;
}

function pick(data, snake, camel, def = null) {
	if (data[snake] !== undefined) return data[snake];
	if (camel && data[camel] !== undefined) return data[camel];
	return def;
}

/**
 * Create startup from validated API body (snake_case) plus user_id.
 * Also accepts legacy camelCase keys for compatibility.
 */
async function create(data) {
	const userId = data.user_id ?? data.userId;
	const startup_name = data.startup_name ?? data.startupName;
	const industry = data.industry ?? null;
	const description = data.description ?? null;
	const business_stage = data.business_stage ?? data.businessStage ?? null;
	const founded_year = data.founded_year ?? data.foundedYear ?? null;
	const team_size = data.team_size ?? data.teamSize ?? null;
	const location = data.location ?? null;
	const website = data.website ?? null;
	const funding_needed = data.funding_needed ?? data.fundingNeeded ?? null;

	const startup_tagline = pick(data, "startup_tagline", "startupTagline");
	const stage_type = pick(data, "stage_type", "stageType");
	const region = pick(data, "region", "region");
	const city = pick(data, "city", "city");
	const founder_role = pick(data, "founder_role", "founderRole");
	const bio = pick(data, "bio", "bio");
	const founding_date = pick(data, "founding_date", "foundingDate");
	const social_links = pick(data, "social_links", "socialLinks");
	const pitch_deck_url = pick(data, "pitch_deck_url", "pitchDeckUrl");
	const profile_image = pick(data, "profile_image", "profileImage");

	const res = await pool.query(
		`INSERT INTO startups (
        user_id, startup_name, industry, description, business_stage, founded_year, team_size,
        location, website, funding_needed,
        startup_tagline, stage_type, region, city, founder_role, bio, founding_date,
        social_links, pitch_deck_url, profile_image
      )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
		[
			userId,
			startup_name,
			industry,
			description,
			business_stage,
			founded_year,
			team_size,
			location,
			website,
			funding_needed,
			startup_tagline,
			stage_type,
			region,
			city,
			founder_role,
			bio,
			founding_date,
			social_links,
			pitch_deck_url,
			profile_image,
		],
	);
	return res.rows[0];
}

const UPDATEABLE = new Set([
	"startup_name",
	"industry",
	"description",
	"business_stage",
	"founded_year",
	"team_size",
	"location",
	"website",
	"funding_needed",
	"startup_tagline",
	"stage_type",
	"region",
	"city",
	"founder_role",
	"bio",
	"founding_date",
	"social_links",
	"pitch_deck_url",
	"profile_image",
]);

async function update(startupId, updates) {
	const entries = Object.entries(updates || {}).filter(
		([k, v]) => UPDATEABLE.has(k) && v !== undefined,
	);
	if (entries.length === 0) {
		return findById(startupId);
	}
	const setParts = [];
	const values = [];
	let i = 1;
	for (const [key, val] of entries) {
		if (key === "social_links") {
			setParts.push(`${key} = $${i++}::jsonb`);
			values.push(val);
		} else {
			setParts.push(`${key} = $${i++}`);
			values.push(val);
		}
	}
	setParts.push("updated_at = NOW()");
	values.push(startupId);
	const res = await pool.query(
		`UPDATE startups SET ${setParts.join(", ")} WHERE startup_id = $${i} RETURNING *`,
		values,
	);
	return res.rows[0] || null;
}

module.exports = { findById, findByIdWithUser, findByUserId, create, update };
