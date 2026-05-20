const pool = require("../config/db");

function normalizeJsonb(val, { commaSeparatedArray = false } = {}) {
	if (val === undefined || val === null || val === "") return null;
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (!trimmed) return null;
		try {
			return JSON.parse(trimmed);
		} catch {
			if (commaSeparatedArray) {
				return trimmed
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
			}
			return trimmed;
		}
	}
	return val;
}

function jsonbParam(val, options) {
	const normalized = normalizeJsonb(val, options);
	return normalized === null ? null : JSON.stringify(normalized);
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING *`,
		[
			data.user_id,
			data.headline ?? null,
			data.expertise ?? null,
			data.years_experience ?? null,
			data.hourly_rate ?? null,
			data.country ?? null,
			data.bio ?? null,
			jsonbParam(data.availability),
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
	if (patch.availability !== undefined) patch.availability = jsonbParam(patch.availability);
	if (patch.skills !== undefined) {
		patch.skills = jsonbParam(patch.skills, { commaSeparatedArray: true });
	}
	if (patch.industries !== undefined) {
		patch.industries = jsonbParam(patch.industries, { commaSeparatedArray: true });
	}
	if (patch.preferred_time_slots !== undefined) {
		patch.preferred_time_slots = jsonbParam(patch.preferred_time_slots);
	}
	if (patch.mentorship_categories !== undefined) {
		patch.mentorship_categories = jsonbParam(patch.mentorship_categories, {
			commaSeparatedArray: true,
		});
	}
	if (patch.preferred_startup_stages !== undefined) {
		patch.preferred_startup_stages = jsonbParam(patch.preferred_startup_stages, {
			commaSeparatedArray: true,
		});
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
			key === "availability" ||
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
