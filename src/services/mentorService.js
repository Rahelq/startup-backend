const pool = require("../config/db");
const mentorModel = require("../models/mentorModel");
const documentModel = require("../models/documentModel");
const documentUploadService = require("./documentUploadService");
const cloudinarySvc = require("./cloudinaryService");

function cloudinaryResourceType(doc) {
  const mime = doc.mime_type || "";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "raw";
}

async function deleteExistingDocumentsOfType(userId, mentorId, documentType, keepIds = []) {
  const keep = new Set(keepIds.filter(Boolean));
  const existing = await documentModel.findByUserContextAndType(
    userId,
    "mentor_profile",
    mentorId,
    documentType
  );

  for (const doc of existing) {
    if (keep.has(doc.document_id)) continue;
    if (doc.public_id) {
      await cloudinarySvc.deleteByPublicId(doc.public_id, cloudinaryResourceType(doc));
    }
    await documentModel.deleteById(doc.document_id);
  }
}

async function persistMentorFiles(userId, mentorId, files, options = {}) {
  if (!files || typeof files !== "object") return;
  const replaceExisting = !!options.replaceExisting;
  const groups = {
    cv: files.cv,
    certifications: files.certifications,
    profile_image: files.profile_image,
    intro_video: files.intro_video,
    government_id: files.government_id,
    passport: files.passport,
    kebele_id: files.kebele_id,
    employment_proof: files.employment_proof,
  };
  let any = false;
  for (const v of Object.values(groups)) {
    if (!v) continue;
    const arr = Array.isArray(v) ? v : [v];
    if (arr.some((f) => f?.buffer?.length)) any = true;
  }
  if (!any) return;
  if (!cloudinarySvc.isConfigured()) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
    err.status = 503;
    throw err;
  }

  const saveList = async (field, fileList, docType) => {
    const arr = Array.isArray(fileList) ? fileList : fileList ? [fileList] : [];
    const saved = [];
    for (const file of arr) {
      if (!file?.buffer) continue;
      const doc = await documentUploadService.saveUploadedFile(file, {
        userId,
        documentType: docType,
        contextType: "mentor_profile",
        contextId: mentorId,
      });
      saved.push(doc);
    }
    if (replaceExisting && saved.length) {
      await deleteExistingDocumentsOfType(
        userId,
        mentorId,
        docType,
        saved.map((doc) => doc.document_id)
      );
    }
    return saved;
  };

  await saveList("cv", files.cv, "cv");
  await saveList("certifications", files.certifications, "certification");
  await saveList("government_id", files.government_id, "government_id");
  await saveList("passport", files.passport, "passport");
  await saveList("kebele_id", files.kebele_id, "kebele_id");
  await saveList("employment_proof", files.employment_proof, "employment_proof");

  const img = files.profile_image?.[0] || files.profile_image;
  if (img?.buffer) {
    const d = await documentUploadService.saveUploadedFile(img, {
      userId,
      documentType: "profile_image",
      contextType: "mentor_profile",
      contextId: mentorId,
      kind: "image",
    });
    if (replaceExisting) {
      await deleteExistingDocumentsOfType(userId, mentorId, "profile_image", [d.document_id]);
    }
    if (d.file_url) await mentorModel.update(mentorId, { profile_picture: d.file_url });
  }

  const vid = files.intro_video?.[0] || files.intro_video;
  if (vid?.buffer) {
    const d = await documentUploadService.saveUploadedFile(vid, {
      userId,
      documentType: "intro_video",
      contextType: "mentor_profile",
      contextId: mentorId,
      kind: "video",
    });
    if (replaceExisting) {
      await deleteExistingDocumentsOfType(userId, mentorId, "intro_video", [d.document_id]);
    }
    if (d.file_url) await mentorModel.update(mentorId, { intro_video_url: d.file_url });
  }
}

async function attachDocuments(mentor) {
  if (!mentor) return null;
  const unified = await documentModel.findByUserAndContext(
    mentor.user_id,
    "mentor_profile",
    mentor.mentor_id
  );
  const legacy = await pool.query(
    `SELECT mentor_document_id AS document_id, document_type, file_name, file_path AS file_url,
            file_type AS mime_type, file_size_bytes, created_at, 'mentor_documents' AS source
     FROM mentor_documents WHERE mentor_id = $1`,
    [mentor.mentor_id]
  );
  mentor.documents = [...unified, ...legacy.rows];
  return mentor;
}

exports.createMentorProfile = async (userId, mentorData, files = {}) => {
  const existing = await mentorModel.findByUserId(userId);
  if (existing) {
    throw { status: 409, message: "Mentor profile already exists for this user" };
  }

  const mentor = await mentorModel.create({
    user_id: userId,
    ...mentorData,
  });

  try {
    await persistMentorFiles(userId, mentor.mentor_id, files);
  } catch (e) {
    console.error("mentor file upload:", e.message || e);
    if (e.status === 503 || e.status === 400) throw e;
  }

  return attachDocuments(await mentorModel.findByUserId(userId));
};

exports.getMentorProfile = async (userId) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    throw { status: 404, message: "Mentor profile not found" };
  }
  return attachDocuments(mentor);
};

exports.updateMentorProfile = async (userId, updates, files = {}) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    throw { status: 404, message: "Mentor profile not found" };
  }

  await mentorModel.update(mentor.mentor_id, updates);
  try {
    await persistMentorFiles(userId, mentor.mentor_id, files, { replaceExisting: true });
  } catch (e) {
    console.error("mentor file upload:", e.message || e);
    if (e.status === 503 || e.status === 400) throw e;
  }
  return attachDocuments(await mentorModel.findByUserId(userId));
};

exports.getAvailability = async (userId) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    throw { status: 404, message: "Mentor profile not found" };
  }
  return mentor.availability;
};

exports.updateAvailability = async (userId, availability) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    throw { status: 404, message: "Mentor profile not found" };
  }
  return mentorModel.update(mentor.mentor_id, { availability });
};

exports.searchMentors = async (filters) => {
  const { q, expertise, country, limit = 50, offset = 0 } = filters;

  const maxLimit = Math.min(Number(limit) || 50, 100);
  const startOffset = Number(offset) || 0;

  const queryFilters = [
    "u.is_active = true",
    "u.is_approved = true",
    "m.verification_status = 'approved'",
  ];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    queryFilters.push(
      `(m.headline ILIKE $${values.length} OR m.expertise ILIKE $${values.length})`
    );
  }
  if (expertise) {
    values.push(`%${expertise}%`);
    queryFilters.push(`m.expertise ILIKE $${values.length}`);
  }
  if (country) {
    values.push(`%${country}%`);
    queryFilters.push(`m.country ILIKE $${values.length}`);
  }

  values.push(maxLimit, startOffset);

  const result = await pool.query(
    `SELECT m.*, u.user_id, u.first_name, u.last_name, u.email
		 FROM mentors m
		 JOIN users u ON u.user_id = m.user_id
		 WHERE ${queryFilters.join(" AND ")}
		 ORDER BY m.created_at DESC
		 LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return result.rows;
};

exports.getDashboard = async (userId) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    throw { status: 404, message: "Mentor profile not found" };
  }

  const [sessions, requests, reviews] = await Promise.all([
    pool.query(
      "SELECT * FROM mentorship_sessions WHERE mentor_id = $1 ORDER BY session_date DESC",
      [mentor.mentor_id]
    ),
    pool.query("SELECT * FROM mentorship_requests WHERE mentor_id = $1 ORDER BY created_at DESC", [
      mentor.mentor_id,
    ]),
    pool.query("SELECT * FROM reviews WHERE mentor_id = $1 ORDER BY created_at DESC", [
      mentor.mentor_id,
    ]),
  ]);

  return {
    sessions: sessions.rows,
    requests: requests.rows,
    reviews: reviews.rows,
  };
};

exports.getMentorById = async (mentorId) => {
  const row = await mentorModel.findByIdWithUser(mentorId);
  if (!row) {
    throw { status: 404, message: "Mentor not found" };
  }
  return attachDocuments(row);
};

exports.deleteMentorDocument = async (userId, documentId) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) throw { status: 404, message: "Mentor profile not found" };

  const docRow = await documentModel.findById(documentId);
  if (docRow && docRow.user_id === userId && docRow.context_type === "mentor_profile") {
    if (docRow.public_id) {
      let rt = "raw";
      if ((docRow.mime_type || "").startsWith("video/")) rt = "video";
      else if ((docRow.mime_type || "").startsWith("image/")) rt = "image";
      await cloudinarySvc.deleteByPublicId(docRow.public_id, rt);
    }
    await documentModel.deleteById(documentId);
    return;
  }

  const leg = await pool.query(
    `SELECT md.* FROM mentor_documents md
     JOIN mentors m ON m.mentor_id = md.mentor_id
     WHERE md.mentor_document_id = $1 AND m.user_id = $2`,
    [documentId, userId]
  );
  if (!leg.rowCount) throw { status: 404, message: "Document not found" };
  const d = leg.rows[0];
  if (d.file_path && !String(d.file_path).startsWith("http")) {
    const fs = require("fs");
    try {
      fs.unlinkSync(d.file_path);
    } catch {
      // ignore missing file
    }
  }
  await pool.query("DELETE FROM mentor_documents WHERE mentor_document_id = $1", [documentId]);
};

exports.replaceMentorDocument = async (userId, documentId, file) => {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) throw { status: 404, message: "Mentor profile not found" };
  if (!file?.buffer) throw { status: 400, message: "File required" };

  let documentType = "cv";
  const docRow = await documentModel.findById(documentId);
  if (docRow && docRow.user_id === userId && docRow.context_type === "mentor_profile") {
    documentType = docRow.document_type || documentType;
  } else {
    const legacy = await pool.query(
      `SELECT md.document_type FROM mentor_documents md
       JOIN mentors m ON m.mentor_id = md.mentor_id
       WHERE md.mentor_document_id = $1 AND m.user_id = $2`,
      [documentId, userId]
    );
    if (!legacy.rowCount) throw { status: 404, message: "Document not found" };
    documentType = legacy.rows[0].document_type || documentType;
  }

  await exports.deleteMentorDocument(userId, documentId);
  return documentUploadService.saveUploadedFile(file, {
    userId,
    documentType,
    contextType: "mentor_profile",
    contextId: mentor.mentor_id,
  });
};
