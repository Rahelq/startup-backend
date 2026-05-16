const Joi = require("joi");

// Allow any email-like format for testing (.test domain is valid for testing)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerSchema = Joi.object({
  first_name: Joi.string().trim().optional(),
  last_name: Joi.string().trim().optional(),
  full_name: Joi.string().trim().optional(),
  email: Joi.string()
    .pattern(emailPattern)
    .required()
    .messages({ "string.pattern.base": "email must be valid" }),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("Startup", "Investor", "Mentor").optional(),
  phone_number: Joi.string().optional(),
}).unknown(true);

const loginSchema = Joi.object({
  email: Joi.string()
    .pattern(emailPattern)
    .required()
    .messages({ "string.pattern.base": "email must be valid" }),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .pattern(emailPattern)
    .required()
    .messages({ "string.pattern.base": "email must be valid" }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().min(20).required(),
  password: Joi.string().min(8).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
