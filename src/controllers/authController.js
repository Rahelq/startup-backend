const authService = require("../services/authService");
const mentorModel = require("../models/mentorModel");

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

// ========================
// REGISTER
// ========================
exports.register = async (req, res) => {
  const { first_name, last_name, full_name, email, password, role } = req.validatedBody || req.body;

  try {
    const nameParts =
      first_name && last_name ? { first_name, last_name } : splitFullName(full_name);

    if (!nameParts || !email || !password) {
      return res.status(400).json({
        message: "full_name (or first_name/last_name), email and password are required",
      });
    }

    const { user, token, refreshToken } = await authService.registerUser({
      firstName: nameParts.first_name,
      lastName: nameParts.last_name,
      email,
      password,
      role: role || "Startup",
    });

    return res.status(201).json({
      message:
        "User registered successfully. Complete your role profile, upload required documents, then submit for admin review.",
      user,
      token,
      refreshToken,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

// ========================
// LOGIN
// ========================
exports.login = async (req, res) => {
  const { email, password } = req.validatedBody || req.body;
  const ip = req.ip;
  const device = {
    device_id: req.headers["x-device-id"] || null,
    device_name: req.headers["user-agent"] || null,
    browser: req.headers["user-agent"] || null,
    os: req.headers["x-os"] || null,
    ip_address: req.ip,
    location: null,
    is_trusted: req.headers["x-device-trusted"] === "1",
  };

  try {
    const { user, token, refreshToken } = await authService.loginUser({
      email,
      password,
      ip,
      device,
    });

    let mentorProfile = null;
    if (user.role === "Mentor") {
      mentorProfile = await mentorModel.findByUserId(user.user_id);
    }

    return res.json({
      message: "Login successful 🔐",
      token,
      refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        verification_status: user.verification_status,
        account_status: user.account_status,
      },
      mentor: mentorProfile,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

// POST /auth/refresh
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  try {
    const { token } = await authService.refreshAccessToken(refreshToken);
    return res.json({ token });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

// POST /auth/logout
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  try {
    const result = await authService.logoutUser(refreshToken);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.validatedBody || req.body;
  try {
    const out = await authService.requestPasswordReset(email);
    return res.json(out);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.validatedBody || req.body;
  try {
    const out = await authService.resetPasswordWithToken({ token, newPassword: password });
    return res.json(out);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};
