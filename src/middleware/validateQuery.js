module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query || {}, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    return res.status(400).json({ message: "Validation error", details });
  }
  req.validatedQuery = value;
  next();
};
