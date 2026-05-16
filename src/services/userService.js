const pool = require("../config/db");

function splitFullName(fullName) {
  if (!fullName || typeof fullName !== "string") return null;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: parts[0] };
  }
  return {
    first_name: parts.shift(),
    last_name: parts.join(" "),
  };
}

async function getRoleProfile(userId, role) {
  if (role === "Mentor") {
    const mentorModel = require("../models/mentorModel");
    return await mentorModel.findByUserId(userId);
  }

  if (role === "Startup") {
    const startupModel = require("../models/startupModel");
    return await startupModel.findByUserId(userId);
  }

  if (role === "Investor") {
    const investorModel = require("../models/investorModel");
    return await investorModel.findByUserId(userId);
  }

  return null;
}

exports.getMyProfile = async (userId) => {
  const userModel = require("../models/userModel");
  const user = await userModel.findById(userId);

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  const roleProfile = await getRoleProfile(user.user_id, user.role);

  return {
    user,
    profile: roleProfile,
  };
};

exports.updateMyProfile = async (userId, updateData) => {
  const { full_name, first_name, last_name, phone_number, email } = updateData;

  let nextFirstName = null;
  let nextLastName = null;

  if (full_name !== undefined) {
    const parsed = splitFullName(full_name);
    if (!parsed) {
      throw { status: 400, message: "full_name must be a non-empty string" };
    }
    nextFirstName = parsed.first_name;
    nextLastName = parsed.last_name;
  } else {
    if (first_name !== undefined) {
      if (typeof first_name !== "string" || !first_name.trim()) {
        throw {
          status: 400,
          message: "first_name must be a non-empty string",
        };
      }
      nextFirstName = first_name.trim();
    }

    if (last_name !== undefined) {
      if (typeof last_name !== "string" || !last_name.trim()) {
        throw {
          status: 400,
          message: "last_name must be a non-empty string",
        };
      }
      nextLastName = last_name.trim();
    }
  }

  if (phone_number !== undefined && phone_number !== null && phone_number !== "") {
    if (typeof phone_number !== "string" || phone_number.trim().length < 7) {
      throw {
        status: 400,
        message: "phone_number must be a valid phone number",
      };
    }
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !email.includes("@") || !email.trim()) {
      throw { status: 400, message: "email must be valid" };
    }

    const existingEmail = await pool.query(
      "SELECT user_id FROM users WHERE email = $1 AND user_id <> $2",
      [email.trim(), userId]
    );

    if (existingEmail.rowCount) {
      throw { status: 409, message: "Email already in use" };
    }
  }

  const user = await pool.query(
    `UPDATE users
		 SET
			first_name = COALESCE($1, first_name),
			last_name = COALESCE($2, last_name),
			phone_number = CASE
				WHEN $3::text IS NULL THEN phone_number
				WHEN $3::text = '' THEN NULL
				ELSE $3
			END,
			email = COALESCE($4, email)
		 WHERE user_id = $5
		 RETURNING
			user_id,
			first_name,
			last_name,
			email,
			role,
			phone_number,
			is_active,
			is_approved,
			approved_at,
			created_at`,
    [
      nextFirstName,
      nextLastName,
      phone_number === undefined ? null : phone_number,
      email === undefined ? null : email.trim(),
      userId,
    ]
  );

  if (!user.rowCount) {
    throw { status: 404, message: "User not found" };
  }

  const updatedUser = user.rows[0];
  const roleProfile = await getRoleProfile(updatedUser.user_id, updatedUser.role);

  return {
    message: "User profile updated",
    user: updatedUser,
    profile: roleProfile,
  };
};

/** Marks account ready for admin verification queue (after profile + docs). */
exports.submitProfileForReview = async (userId) => {
  const userModel = require("../models/userModel");
  const user = await userModel.findById(userId);
  if (!user) {
    throw { status: 404, message: "User not found" };
  }
  if (user.role === "Admin") {
    throw { status: 400, message: "Not applicable" };
  }
  const profile = await getRoleProfile(userId, user.role);
  if (!profile) {
    throw { status: 400, message: "Create your role profile before submitting for review" };
  }
  await pool.query(
    "UPDATE users SET profile_submitted_at = NOW(), updated_at = NOW() WHERE user_id = $1",
    [userId]
  );
  return {
    message: "Profile submitted for admin review",
    profile_submitted_at: new Date().toISOString(),
  };
};
