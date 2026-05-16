const multer = require("multer");

const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES || 26 * 1024 * 1024);

/** Memory storage for Cloudinary pipeline (no local disk). */
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_BYTES },
});

module.exports = upload;
