const pool = require("../config/db");
const investorModel = require("../models/investorModel");
const startupModel = require("../models/startupModel");
const documentModel = require("../models/documentModel");
const documentUploadService = require("./documentUploadService");
const cloudinarySvc = require("./cloudinaryService");

async function persistInvestorFiles(userId, investorId, files) {
  if (!files || typeof files !== "object") return;
  const pic =
    files.profile_image?.[0] ||
    files.profile_image ||
    files.profile_picture?.[0] ||
    files.profile_picture;
  const portfolio = files.portfolio;
  const governmentId = files.government_id;
  const passport = files.passport;
  const kebeleId = files.kebele_id;
  const businessRegistration = files.business_registration;
  const tradeLicense = files.trade_license;
  const tinCertificate = files.tin_certificate;
  let any = false;
  if (pic?.buffer) any = true;
  if (portfolio) {
    const arr = Array.isArray(portfolio) ? portfolio : [portfolio];
    if (arr.some((f) => f?.buffer?.length)) any = true;
  }
  for (const docGroup of [
    governmentId,
    passport,
    kebeleId,
    businessRegistration,
    tradeLicense,
    tinCertificate,
  ]) {
    const arr = Array.isArray(docGroup) ? docGroup : docGroup ? [docGroup] : [];
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
  if (pic?.buffer) {
    const d = await documentUploadService.saveUploadedFile(pic, {
      userId,
      documentType: "profile_image",
      contextType: "investor_profile",
      contextId: investorId,
      kind: "image",
    });
    if (d.file_url) await investorModel.update(investorId, { profile_picture: d.file_url });
  }
  for (const [field, docType] of [
    [governmentId, "government_id"],
    [passport, "passport"],
    [kebeleId, "kebele_id"],
    [businessRegistration, "business_registration"],
    [tradeLicense, "trade_license"],
    [tinCertificate, "tin_certificate"],
  ]) {
    const arr = Array.isArray(field) ? field : field ? [field] : [];
    for (const file of arr) {
      if (!file?.buffer) continue;
      await documentUploadService.saveUploadedFile(file, {
        userId,
        documentType: docType,
        contextType: "investor_profile",
        contextId: investorId,
      });
    }
  }
  if (portfolio) {
    const arr = Array.isArray(portfolio) ? portfolio : [portfolio];
    for (const file of arr) {
      if (!file?.buffer) continue;
      await documentUploadService.saveUploadedFile(file, {
        userId,
        documentType: "portfolio",
        contextType: "investor_profile",
        contextId: investorId,
      });
    }
  }
}

async function attachInvestorDocuments(investor) {
  if (!investor) return null;
  const unified = await documentModel.findByUserAndContext(
    investor.user_id,
    "investor_profile",
    investor.investor_id
  );
  let legacy = { rows: [] };
  try {
    legacy = await pool.query(
      `SELECT investor_document_id AS document_id, document_type, file_name, file_path AS file_url,
            file_type AS mime_type, file_size_bytes, created_at, 'investor_documents' AS source
       FROM investor_documents WHERE investor_id = $1`,
      [investor.investor_id]
    );
  } catch {
    legacy = { rows: [] };
  }
  investor.documents = [...unified, ...legacy.rows];
  return investor;
}

exports.createInvestorProfile = async (userId, investorData, files = {}) => {
  const existing = await investorModel.findByUserId(userId);
  if (existing) {
    throw { status: 409, message: "Investor profile already exists for this user" };
  }

  const investor = await investorModel.create({
    user_id: userId,
    ...investorData,
  });

  try {
    await persistInvestorFiles(userId, investor.investor_id, files);
  } catch (e) {
    console.error("investor file upload:", e.message || e);
    if (e.status === 503 || e.status === 400) throw e;
  }

  return attachInvestorDocuments(await investorModel.findByUserId(userId));
};

exports.getInvestorProfile = async (userId) => {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) {
    throw { status: 404, message: "Investor profile not found" };
  }
  return attachInvestorDocuments(investor);
};

exports.updateInvestorProfile = async (userId, updates, files = {}) => {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) {
    throw { status: 404, message: "Investor profile not found" };
  }

  await investorModel.update(investor.investor_id, updates);
  try {
    await persistInvestorFiles(userId, investor.investor_id, files);
  } catch (e) {
    console.error("investor file upload:", e.message || e);
    if (e.status === 503 || e.status === 400) throw e;
  }
  return attachInvestorDocuments(await investorModel.findByUserId(userId));
};

exports.deleteInvestorDocument = async (userId, documentId) => {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) throw { status: 404, message: "Investor profile not found" };

  const docRow = await documentModel.findById(documentId);
  if (docRow && docRow.user_id === userId && docRow.context_type === "investor_profile") {
    if (docRow.public_id) {
      let rt = "raw";
      if ((docRow.mime_type || "").startsWith("video/")) rt = "video";
      else if ((docRow.mime_type || "").startsWith("image/")) rt = "image";
      await cloudinarySvc.deleteByPublicId(docRow.public_id, rt);
    }
    await documentModel.deleteById(documentId);
    return;
  }

  try {
    const leg = await pool.query(
      `SELECT idoc.* FROM investor_documents idoc
       JOIN investors i ON i.investor_id = idoc.investor_id
       WHERE idoc.investor_document_id = $1 AND i.user_id = $2`,
      [documentId, userId]
    );
    if (leg.rowCount) {
      const d = leg.rows[0];
      if (d.file_path && !String(d.file_path).startsWith("http")) {
        const fs = require("fs");
        try {
          fs.unlinkSync(d.file_path);
        } catch {
          // ignore
        }
      }
      await pool.query("DELETE FROM investor_documents WHERE investor_document_id = $1", [
        documentId,
      ]);
      return;
    }
  } catch {
    /* table may not exist */
  }
  throw { status: 404, message: "Document not found" };
};

exports.updateInvestorDocument = async (userId, documentId, file) => {
  await exports.deleteInvestorDocument(userId, documentId);
  const investor = await investorModel.findByUserId(userId);
  if (!investor) throw { status: 404, message: "Investor profile not found" };
  if (!file?.buffer) throw { status: 400, message: "File required" };
  return documentUploadService.saveUploadedFile(file, {
    userId,
    documentType: "portfolio",
    contextType: "investor_profile",
    contextId: investor.investor_id,
  });
};

exports.searchStartups = async (filters) => {
  const { q, industry, stage, country, limit = 50, offset = 0 } = filters;

  const maxLimit = Math.min(Number(limit) || 50, 100);
  const startOffset = Number(offset) || 0;

  const queryFilters = ["u.is_active = true", "u.is_approved = true"];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    queryFilters.push(
      `(s.startup_name ILIKE $${values.length} OR s.industry ILIKE $${values.length})`
    );
  }
  if (industry) {
    values.push(`%${industry}%`);
    queryFilters.push(`s.industry ILIKE $${values.length}`);
  }
  if (stage) {
    values.push(`%${stage}%`);
    queryFilters.push(`s.business_stage ILIKE $${values.length}`);
  }
  if (country) {
    values.push(`%${country}%`);
    queryFilters.push(`s.location ILIKE $${values.length}`);
  }

  values.push(maxLimit, startOffset);

  const result = await pool.query(
    `SELECT s.*, u.user_id, u.first_name, u.last_name, u.email
		 FROM startups s
		 JOIN users u ON u.user_id = s.user_id
		 WHERE ${queryFilters.join(" AND ")}
		 ORDER BY s.created_at DESC
		 LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return result.rows;
};

exports.getDashboard = async (userId) => {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) {
    throw { status: 404, message: "Investor profile not found" };
  }

  const [investments, requests, payments] = await Promise.all([
    pool.query(
      `SELECT i.*
			 FROM investments i
			 JOIN investment_requests ir ON ir.investment_request_id = i.investment_request_id
			 WHERE ir.investor_id = $1
			 ORDER BY i.created_at DESC`,
      [investor.investor_id]
    ),
    pool.query(
      "SELECT * FROM investment_requests WHERE investor_id = $1 ORDER BY created_at DESC",
      [investor.investor_id]
    ),
    pool.query("SELECT * FROM payments WHERE payer_id = $1 ORDER BY created_at DESC", [
      investor.user_id,
    ]),
  ]);

  return {
    investments: investments.rows,
    requests: requests.rows,
    payments: payments.rows,
  };
};

exports.listApprovedInvestors = async () => investorModel.findAllApprovedWithUsers();

exports.getStartupDetails = async (startupId) => {
  const row = await startupModel.findByIdWithUser(startupId);
  if (!row) {
    throw { status: 404, message: "Startup not found" };
  }
  return row;
};

exports.getRecommendations = async (userId) => {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) {
    throw { status: 404, message: "Investor profile not found" };
  }

  const result = await pool.query(
    `SELECT s.*, u.first_name, u.last_name, u.email,
        (CASE WHEN s.industry IS NOT NULL AND $1::text IS NOT NULL
              AND s.industry ILIKE '%' || $1 || '%' THEN 50 ELSE 0 END
         + CASE WHEN s.business_stage IS NOT NULL AND $2::text IS NOT NULL
              AND s.business_stage ILIKE '%' || $2 || '%' THEN 35 ELSE 0 END
         + CASE WHEN s.funding_needed IS NOT NULL AND $3::numeric IS NOT NULL
              AND s.funding_needed <= $3 THEN 15 ELSE 0 END) AS match_score
     FROM startups s
     JOIN users u ON u.user_id = s.user_id
     WHERE u.is_active = true AND u.is_approved = true
     ORDER BY match_score DESC, s.created_at DESC
     LIMIT 20`,
    [investor.preferred_industry, investor.investment_stage, investor.investment_budget]
  );

  return {
    method: "rule_based_profile_match",
    startups: result.rows,
  };
};
