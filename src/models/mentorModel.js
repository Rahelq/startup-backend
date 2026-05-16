const pool = require("../config/db");

function normalizeJsonb(val) {
	if (val === undefined || val === null) return null;
	if (typeof val === "string") {
		try {
			return JSON.parse(val);
		} catch {
			return val;
		}
	}
	return val;
}

async function findByIdWithUser(mentorId) {
	const res = await pool.query(
		`SELECT m.*, u.user_id, u.first_name, u.last_name, u.email
     FROM mentors m
     JOIN users u ON u.user_id = m.user_id
     WHERE m.mentor_id = $1`,
		[mentorId],
	);
	return res.rows[0] || null;
}

async function findByUserId(userId) {
	const res = await pool.query("SELECT * FROM mentors WHERE user_id = $1", [userId]);
	return res.rows[0] || null;
}

async function create(data) {
	const res = await pool.query(
		`INSERT INTO mentors (
        user_id, headline, expertise, years_experience, hourly_rate, country, bio, availability
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
		[
			data.user_id,
			data.headline ?? null,
			data.expertise ?? null,
			data.years_experience ?? null,
			data.hourly_rate ?? null,
			data.country ?? null,
			data.bio ?? null,
			data.availability ?? null,
		],
	);
	const mentor = res.rows[0];
	const patch = {};
	for (const key of MENTOR_OPTIONAL_ON_CREATE) {
		if (data[key] !== undefined) patch[key] = data[key];
	}
	if (Object.keys(patch).length) {
		return update(mentor.mentor_id, patch) || mentor;
	}
	return mentor;
}

const MENTOR_OPTIONAL_ON_CREATE = [
	"full_name",
	"expertise_area",
	"session_frequency",
	"preferred_time_slots",
	"previous_mentoring_experience",
	"notable_supported",
	"key_achievements",
	"areas_not_mentoring",
	"intro_video_url",
	"city",
	"pricing_notes",
	"current_organization",
	"current_role",
	"format_preference",
	"primary_industry",
	"secondary_industry",
	"linkedin_url",
	"portfolio_url",
	"mentorship_categories",
	"preferred_startup_stages",
	"skills",
	"industries",
];

const UPDATEABLE = new Set([
	"headline",
	"expertise",
	"skills",
	"industries",
	"years_experience",
	"hourly_rate",
	"country",
	"bio",
	"availability",
	"profile_picture",
	"verification_status",
	"full_name",
	"expertise_area",
	"session_frequency",
	"preferred_time_slots",
	"previous_mentoring_experience",
	"notable_supported",
	"key_achievements",
	"areas_not_mentoring",
	"intro_video_url",
	"city",
	"pricing_notes",
	"current_organization",
	"current_role",
	"format_preference",
	"primary_industry",
	"secondary_industry",
	"linkedin_url",
	"portfolio_url",
	"mentorship_categories",
	"preferred_startup_stages",
]);

async function update(mentorId, updates) {
	const patch = { ...updates };
	if (patch.skills !== undefined) patch.skills = normalizeJsonb(patch.skills);
	if (patch.industries !== undefined) patch.industries = normalizeJsonb(patch.industries);
	if (patch.preferred_time_slots !== undefined) {
		patch.preferred_time_slots = normalizeJsonb(patch.preferred_time_slots);
	}
	if (patch.mentorship_categories !== undefined) {
		patch.mentorship_categories = normalizeJsonb(patch.mentorship_categories);
	}
	if (patch.preferred_startup_stages !== undefined) {
		patch.preferred_startup_stages = normalizeJsonb(patch.preferred_startup_stages);
	}

	const entries = Object.entries(patch).filter(
		([k, v]) => UPDATEABLE.has(k) && v !== undefined,
	);
	if (entries.length === 0) {
		const res = await pool.query("SELECT * FROM mentors WHERE mentor_id = $1", [mentorId]);
		return res.rows[0] || null;
	}
	const setParts = [];
	const values = [];
	let i = 1;
	for (const [key, val] of entries) {
		if (
			key === "skills" ||
			key === "industries" ||
			key === "preferred_time_slots" ||
			key === "mentorship_categories" ||
			key === "preferred_startup_stages"
		) {
			setParts.push(`${key} = $${i++}::jsonb`);
			values.push(val);
		} else {
			setParts.push(`${key} = $${i++}`);
			values.push(val);
		}
	}
	setParts.push("updated_at = NOW()");
	values.push(mentorId);
	const res = await pool.query(
		`UPDATE mentors SET ${setParts.join(", ")} WHERE mentor_id = $${i} RETURNING *`,
		values,
	);
	return res.rows[0] || null;
}

module.exports = { findByIdWithUser, findByUserId, create, update };
