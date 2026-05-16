const cloudinarySvc = require("./cloudinaryService");
const documentModel = require("../models/documentModel");
// Local file fallback removed to enforce Cloudinary-only uploads

/**
 * Upload file buffer to Cloudinary and persist metadata on `documents`.
 * @param {Express.Multer.File} file
 * @param {{
 *   userId: number,
 *   startupId?: number|null,
 *   documentType: string,
 *   contextType: string,
 *   contextId?: number|null,
 *   description?: string|null,
 *   kind?: 'image'|'document'
 * }} meta
 */
async function saveUploadedFile(file, meta) {
  // If Cloudinary buffer upload path is available, prefer it.
  if (file && file.buffer && file.buffer.length) {
    let kind = meta.kind;
    if (!kind && file.mimetype?.startsWith("video/")) kind = "video";
    else if (!kind && file.mimetype?.startsWith("image/")) kind = "image";
    else if (!kind) kind = "document";
    try {
      const uploaded = await cloudinarySvc.uploadBuffer(file.buffer, {
        mimetype: file.mimetype,
        kind,
        folder: `startupconnect/${meta.contextType || "misc"}`,
        resourceType: kind === "image" ? "image" : kind === "video" ? "video" : "raw",
      });
      return documentModel.create({
        userId: meta.userId,
        startupId: meta.startupId ?? null,
        documentType: meta.documentType,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        fileUrl: uploaded.url,
        publicId: uploaded.public_id,
        filePath: uploaded.url,
        fileName: file.originalname,
        description: meta.description ?? null,
        contextType: meta.contextType,
        contextId: meta.contextId ?? null,
      });
    } catch (err) {
      const e = new Error("Failed to upload file to cloud storage");
      e.cause = err;
      e.status = 502;
      throw e;
    }
  }

  const err = new Error("File payload missing or unsupported");
  err.status = 400;
  throw err;
}

module.exports = { saveUploadedFile };
