const cloudinary = require("cloudinary").v2;
const stream = require("stream");

const IMAGE_MIMES = new Set([
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
]);
const DOC_MIMES = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const VIDEO_MIMES = new Set([
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
]);

const MAX_IMAGE_BYTES = Number(process.env.UPLOAD_MAX_IMAGE_MB || 15) * 1024 * 1024;
const MAX_DOC_BYTES = Number(process.env.UPLOAD_MAX_DOC_MB || 25) * 1024 * 1024;

function configure() {
	cloudinary.config({
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
		api_key: process.env.CLOUDINARY_API_KEY,
		api_secret: process.env.CLOUDINARY_API_SECRET,
	});
}

function isConfigured() {
	return !!(
		process.env.CLOUDINARY_CLOUD_NAME &&
		process.env.CLOUDINARY_API_KEY &&
		process.env.CLOUDINARY_API_SECRET
	);
}

function assertMimeAllowed(mimetype, kind) {
	const m = (mimetype || "").toLowerCase();
	if (kind === "image") {
		if (!IMAGE_MIMES.has(m)) {
			const err = new Error("Invalid image type. Allowed: jpg, png, webp");
			err.status = 400;
			throw err;
		}
		return;
	}
	if (kind === "document") {
		if (!DOC_MIMES.has(m) && !IMAGE_MIMES.has(m)) {
			const err = new Error("Invalid document type. Allowed: pdf, docx, pptx, or images");
			err.status = 400;
			throw err;
		}
		return;
	}
	if (kind === "video") {
		if (!VIDEO_MIMES.has(m)) {
			const err = new Error("Invalid video type. Allowed: mp4, webm, mov");
			err.status = 400;
			throw err;
		}
		return;
	}
	if (!IMAGE_MIMES.has(m) && !DOC_MIMES.has(m)) {
		const err = new Error("Unsupported file type");
		err.status = 400;
		throw err;
	}
}

function assertSize(buffer, kind) {
	const len = buffer?.length || 0;
	const max =
		kind === "image" ? MAX_IMAGE_BYTES : kind === "video" ? MAX_DOC_BYTES * 2 : MAX_DOC_BYTES;
	if (len > max) {
		const err = new Error(`File too large (max ${kind === "image" ? "image" : "document"} size exceeded)`);
		err.status = 400;
		throw err;
	}
}

function inferKind(mimetype, explicitKind) {
	if (explicitKind === "image" || explicitKind === "document" || explicitKind === "video") {
		return explicitKind;
	}
	const m = (mimetype || "").toLowerCase();
	if (IMAGE_MIMES.has(m)) return "image";
	if (VIDEO_MIMES.has(m)) return "video";
	return "document";
}

/**
 * Upload a buffer to Cloudinary. Returns secure_url and public_id.
 * @param {Buffer} buffer
 * @param {{ folder?: string, resourceType?: string, mimetype?: string, kind?: 'image'|'document' }} opts
 */
async function uploadBuffer(buffer, opts = {}) {
	if (!isConfigured()) {
		const err = new Error(
			"Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
		);
		err.status = 503;
		throw err;
	}
	configure();
	const kind = inferKind(opts.mimetype, opts.kind);
	assertMimeAllowed(opts.mimetype, kind);
	assertSize(buffer, kind);

	const folder = opts.folder || "startupconnect";
	const resourceType =
		opts.resourceType || (kind === "image" ? "image" : kind === "video" ? "video" : "raw");

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder,
				resource_type: resourceType,
				use_filename: true,
				unique_filename: true,
			},
			(error, result) => {
				if (error) return reject(error);
				resolve({
					url: result.secure_url,
					public_id: result.public_id,
					bytes: result.bytes,
					resource_type: result.resource_type,
				});
			},
		);
		const readable = new stream.Readable();
		readable.push(buffer);
		readable.push(null);
		readable.pipe(uploadStream);
	});
}

async function deleteByPublicId(publicId, resourceType = "image") {
	if (!publicId || !isConfigured()) return;
	configure();
	try {
		await cloudinary.uploader.destroy(publicId, {
			resource_type: resourceType === "raw" ? "raw" : resourceType,
		});
	} catch (e) {
		console.warn("cloudinary destroy failed", publicId, e.message || e);
	}
}

module.exports = {
	isConfigured,
	configure,
	uploadBuffer,
	deleteByPublicId,
	IMAGE_MIMES,
	DOC_MIMES,
	VIDEO_MIMES,
};
