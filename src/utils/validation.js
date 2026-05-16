/**
 * Validation utilities for auth, user, and profile endpoints
 * Provides reusable validators and error response formatting
 */

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,}$/; // Flexible international format
const URL_REGEX = /^https?:\/\/.+\..+/;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_\-]+$/;

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validateEmail(email) {
	if (!email || typeof email !== "string") {
		return { valid: false, error: "'email' is required and must be a string" };
	}
	if (!EMAIL_REGEX.test(email)) {
		return { valid: false, error: "'email' must be a valid email address" };
	}
	return { valid: true };
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validatePassword(password) {
	if (!password || typeof password !== "string") {
		return {
			valid: false,
			error: "'password' is required and must be a string",
		};
	}
	if (password.length < 8) {
		return {
			valid: false,
			error: "'password' must be at least 8 characters long",
		};
	}
	if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
		return {
			valid: false,
			error: "'password' must contain both uppercase and lowercase letters",
		};
	}
	if (!/\d/.test(password)) {
		return {
			valid: false,
			error: "'password' must contain at least one number",
		};
	}
	return { valid: true };
}

/**
 * Validates phone number format
 * @param {string} phone - Phone number to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validatePhone(phone) {
	if (!phone || typeof phone !== "string") {
		return {
			valid: false,
			error: "'phone_number' is required and must be a string",
		};
	}
	if (!PHONE_REGEX.test(phone)) {
		return {
			valid: false,
			error: "'phone_number' must be a valid phone number",
		};
	}
	return { valid: true };
}

/**
 * Validates required string field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} minLength - Minimum length (optional)
 * @param {number} maxLength - Maximum length (optional)
 * @returns {object} { valid: boolean, error?: string }
 */
function validateString(value, fieldName, minLength = 1, maxLength = 255) {
	if (!value || typeof value !== "string") {
		return {
			valid: false,
			error: `'${fieldName}' is required and must be a string`,
		};
	}
	if (value.length < minLength) {
		return {
			valid: false,
			error: `'${fieldName}' must be at least ${minLength} characters long`,
		};
	}
	if (value.length > maxLength) {
		return {
			valid: false,
			error: `'${fieldName}' must not exceed ${maxLength} characters`,
		};
	}
	return { valid: true };
}

/**
 * Validates numeric field (non-negative)
 * @param {string|number} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @param {boolean} isInteger - Must be integer (optional)
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {object} { valid: boolean, error?: string, parsedValue?: number }
 */
function validateNumber(
	value,
	fieldName,
	isInteger = false,
	min = 0,
	max = null,
) {
	if (value === undefined || value === null || value === "") {
		return { valid: true, parsedValue: null }; // Optional field
	}

	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		return { valid: false, error: `'${fieldName}' must be a valid number` };
	}

	if (isInteger && !Number.isInteger(parsed)) {
		return { valid: false, error: `'${fieldName}' must be an integer` };
	}

	if (parsed < min) {
		return { valid: false, error: `'${fieldName}' must be at least ${min}` };
	}

	if (max !== null && parsed > max) {
		return {
			valid: false,
			error: `'${fieldName}' must not exceed ${max}`,
		};
	}

	return { valid: true, parsedValue: parsed };
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validateUrl(url) {
	if (!url || typeof url !== "string") {
		return { valid: false, error: "'url' is required and must be a string" };
	}
	if (!URL_REGEX.test(url)) {
		return { valid: false, error: "'url' must be a valid HTTP/HTTPS URL" };
	}
	return { valid: true };
}

/**
 * Validates JSON array field (for tags, skills, etc.)
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} { valid: boolean, error?: string, parsedValue?: array }
 */
function validateArray(value, fieldName) {
	if (value === undefined || value === null) {
		return { valid: true, parsedValue: [] }; // Optional, default to empty array
	}

	let arr = value;
	if (typeof value === "string") {
		try {
			arr = JSON.parse(value);
		} catch {
			return {
				valid: false,
				error: `'${fieldName}' must be a valid JSON array or array of strings`,
			};
		}
	}

	if (!Array.isArray(arr)) {
		return { valid: false, error: `'${fieldName}' must be an array` };
	}

	// Validate all elements are strings
	if (!arr.every((item) => typeof item === "string")) {
		return {
			valid: false,
			error: `'${fieldName}' must contain only strings`,
		};
	}

	return { valid: true, parsedValue: arr };
}

/**
 * Validates investor profile fields
 * @param {object} data - Profile data to validate
 * @returns {object} { valid: boolean, errors: [], validatedData: object }
 */
function validateInvestorProfile(data) {
	const errors = [];
	const validatedData = {};

	// investor_type is required
	if (!data.investor_type || typeof data.investor_type !== "string") {
		errors.push("'investor_type' is required and must be a string");
	} else {
		validatedData.investor_type = data.investor_type;
	}

	// organization_name is optional
	if (data.organization_name !== undefined && data.organization_name !== null) {
		const orgValidation = validateString(
			data.organization_name,
			"organization_name",
			1,
			255,
		);
		if (!orgValidation.valid) {
			errors.push(orgValidation.error);
		} else {
			validatedData.organization_name = data.organization_name;
		}
	}

	// investment_budget is optional numeric
	if (
		data.investment_budget !== undefined &&
		data.investment_budget !== null &&
		data.investment_budget !== ""
	) {
		const budgetValidation = validateNumber(
			data.investment_budget,
			"investment_budget",
		);
		if (!budgetValidation.valid) {
			errors.push(budgetValidation.error);
		} else {
			validatedData.investment_budget = budgetValidation.parsedValue;
		}
	}

	// funding_range_min and funding_range_max
	if (
		data.funding_range_min !== undefined &&
		data.funding_range_min !== null &&
		data.funding_range_min !== ""
	) {
		const minValidation = validateNumber(
			data.funding_range_min,
			"funding_range_min",
		);
		if (!minValidation.valid) {
			errors.push(minValidation.error);
		} else {
			validatedData.funding_range_min = minValidation.parsedValue;
		}
	}

	if (
		data.funding_range_max !== undefined &&
		data.funding_range_max !== null &&
		data.funding_range_max !== ""
	) {
		const maxValidation = validateNumber(
			data.funding_range_max,
			"funding_range_max",
		);
		if (!maxValidation.valid) {
			errors.push(maxValidation.error);
		} else {
			validatedData.funding_range_max = maxValidation.parsedValue;
		}
	}

	// Validate range if both provided
	if (
		validatedData.funding_range_min !== undefined &&
		validatedData.funding_range_max !== undefined &&
		validatedData.funding_range_min > validatedData.funding_range_max
	) {
		errors.push(
			"'funding_range_min' must be less than or equal to 'funding_range_max'",
		);
	}

	// preferred_industry, investment_stage, country, bio are optional strings
	if (
		data.preferred_industry !== undefined &&
		data.preferred_industry !== null
	) {
		const industryValidation = validateString(
			data.preferred_industry,
			"preferred_industry",
			1,
			120,
		);
		if (!industryValidation.valid) {
			errors.push(industryValidation.error);
		} else {
			validatedData.preferred_industry = data.preferred_industry;
		}
	}

	if (data.investment_stage !== undefined && data.investment_stage !== null) {
		const stageValidation = validateString(
			data.investment_stage,
			"investment_stage",
			1,
			50,
		);
		if (!stageValidation.valid) {
			errors.push(stageValidation.error);
		} else {
			validatedData.investment_stage = data.investment_stage;
		}
	}

	if (data.country !== undefined && data.country !== null) {
		const countryValidation = validateString(data.country, "country", 1, 100);
		if (!countryValidation.valid) {
			errors.push(countryValidation.error);
		} else {
			validatedData.country = data.country;
		}
	}

	if (data.bio !== undefined && data.bio !== null) {
		const bioValidation = validateString(data.bio, "bio", 0, 2000);
		if (!bioValidation.valid) {
			errors.push(bioValidation.error);
		} else {
			validatedData.bio = data.bio;
		}
	}

	// portfolio_size is optional integer
	if (
		data.portfolio_size !== undefined &&
		data.portfolio_size !== null &&
		data.portfolio_size !== ""
	) {
		const portfolioValidation = validateNumber(
			data.portfolio_size,
			"portfolio_size",
			true,
		);
		if (!portfolioValidation.valid) {
			errors.push(portfolioValidation.error);
		} else {
			validatedData.portfolio_size = portfolioValidation.parsedValue;
		}
	}

	// investment_focus is optional JSONB array
	if (data.investment_focus !== undefined && data.investment_focus !== null) {
		const focusValidation = validateArray(
			data.investment_focus,
			"investment_focus",
		);
		if (!focusValidation.valid) {
			errors.push(focusValidation.error);
		} else {
			validatedData.investment_focus = focusValidation.parsedValue;
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		validatedData,
	};
}

/**
 * Format consistent error response
 * @param {string} message - Error message
 * @param {array} details - Optional array of error details
 * @returns {object}
 */
function errorResponse(message, details = null) {
	const response = { error: message };
	if (details && Array.isArray(details) && details.length > 0) {
		response.details = details;
	}
	return response;
}

/**
 * Format consistent success response
 * @param {object} data - Response data
 * @param {string} message - Optional message
 * @returns {object}
 */
function successResponse(data, message = null) {
	const response = { ...data };
	if (message) {
		response.message = message;
	}
	return response;
}

module.exports = {
	// Validators
	validateEmail,
	validatePassword,
	validatePhone,
	validateString,
	validateNumber,
	validateUrl,
	validateArray,
	validateInvestorProfile,

	// Response formatters
	errorResponse,
	successResponse,

	// Regex patterns
	EMAIL_REGEX,
	PHONE_REGEX,
	URL_REGEX,
	ALPHANUMERIC_REGEX,
};
