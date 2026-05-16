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

async function findById(investorId) {
	const res = await pool.query("SELECT * FROM investors WHERE investor_id = $1", [investorId]);
	return res.rows[0] || null;
}

async function findByUserId(userId) {
	const res = await pool.query("SELECT * FROM investors WHERE user_id = $1", [userId]);
	return res.rows[0] || null;
}

async function create(data) {
	const res = await pool.query(
		`INSERT INTO investors (
        user_id, investor_type, organization_name, investment_budget,
        preferred_industry, investment_stage, country, portfolio_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
		[
			data.user_id,
			data.investor_type ?? null,
			data.organization_name ?? null,
			data.investment_budget ?? null,
			data.preferred_industry ?? null,
			data.investment_stage ?? null,
			data.country ?? null,
			data.portfolio_size ?? null,
		],
	);
	const investor = res.rows[0];
	const patch = {};
	for (const key of INVESTOR_OPTIONAL_ON_CREATE) {
		if (data[key] !== undefined) patch[key] = data[key];
	}
	if (Object.keys(patch).length) {
		return update(investor.investor_id, patch) || investor;
	}
	return investor;
}

const INVESTOR_OPTIONAL_ON_CREATE = [
	"firm_name",
	"preferred_sector",
	"investment_range",
	"portfolio_summary",
	"industries",
	"location_preference",
	"website",
	"linkedin_url",
	"bio",
	"profile_picture",
	"investment_focus",
	"funding_range_min",
	"funding_range_max",
];

const UPDATEABLE = new Set([
	"investor_type",
	"organization_name",
	"investment_budget",
	"preferred_industry",
	"investment_stage",
	"country",
	"portfolio_size",
	"firm_name",
	"preferred_sector",
	"investment_range",
	"portfolio_summary",
	"industries",
	"location_preference",
	"website",
	"linkedin_url",
	"bio",
	"profile_picture",
	"investment_focus",
	"funding_range_min",
	"funding_range_max",
	"verification_status",
]);

async function update(investorId, updates) {
	const patch = { ...updates };
	if (patch.industries !== undefined) patch.industries = normalizeJsonb(patch.industries);
	if (patch.investment_focus !== undefined) {
		patch.investment_focus = normalizeJsonb(patch.investment_focus);
	}

	const entries = Object.entries(patch || {}).filter(
		([k, v]) => UPDATEABLE.has(k) && v !== undefined,
	);
	if (entries.length === 0) {
		return findById(investorId);
	}
	const setParts = [];
	const values = [];
	let i = 1;
	for (const [key, val] of entries) {
		if (key === "industries" || key === "investment_focus") {
			setParts.push(`${key} = $${i++}::jsonb`);
			values.push(val);
		} else {
			setParts.push(`${key} = $${i++}`);
			values.push(val);
		}
	}
	setParts.push("updated_at = NOW()");
	values.push(investorId);
	const res = await pool.query(
		`UPDATE investors SET ${setParts.join(", ")} WHERE investor_id = $${i} RETURNING *`,
		values,
	);
	return res.rows[0] || null;
}

async function findAllApprovedWithUsers() {
	const res = await pool.query(
		`SELECT i.*, u.user_id, u.first_name, u.last_name, u.email
     FROM investors i
     JOIN users u ON u.user_id = i.user_id
     WHERE u.is_active = true AND u.is_approved = true
     ORDER BY i.created_at DESC`,
	);
	return res.rows;
}

module.exports = {
	findById,
	findByUserId,
	create,
	update,
	findAllApprovedWithUsers,
};
