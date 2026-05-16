const pool = require("../config/db");

/**
 * @param {object} documentData
 * @param {number} documentData.userId
 * @param {number|null} [documentData.startupId]
 * @param {string} documentData.documentType
 * @param {string} [documentData.originalName]
 * @param {string} [documentData.mimeType]
 * @param {number} [documentData.fileSizeBytes]
 * @param {string} [documentData.fileUrl]
 * @param {string} [documentData.publicId]
 * @param {string} [documentData.filePath] legacy / mirror
 * @param {string} [documentData.fileName]
 * @param {string|null} [documentData.description]
 * @param {string|null} [documentData.contextType]
 * @param {number|null} [documentData.contextId]
 */
exports.create = async (documentData) => {
	const {
		userId,
		startupId = null,
		documentType,
		originalName,
		mimeType,
		fileSizeBytes,
		fileUrl,
		publicId,
		filePath,
		fileName,
		description,
		contextType,
		contextId,
	} = documentData;

	const pathVal = filePath ?? fileUrl ?? "";
	const nameVal = fileName ?? originalName ?? "upload";

	const result = await pool.query(
		`INSERT INTO documents (
        user_id, startup_id, document_type, original_name, mime_type, file_size_bytes,
        file_url, public_id, file_path, file_name, description, context_type, context_id
      )
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		 RETURNING *`,
		[
			userId,
			startupId,
			documentType,
			originalName ?? nameVal,
			mimeType ?? null,
			fileSizeBytes ?? null,
			fileUrl ?? null,
			publicId ?? null,
			pathVal,
			nameVal,
			description ?? null,
			contextType ?? null,
			contextId ?? null,
		],
	);

	return result.rows[0];
};

exports.findById = async (documentId) => {
	const result = await pool.query("SELECT * FROM documents WHERE document_id = $1", [
		documentId,
	]);
	return result.rows[0] || null;
};

exports.findByStartupId = async (startupId) => {
	const result = await pool.query(
		`SELECT * FROM documents 
		 WHERE startup_id = $1
		 ORDER BY created_at DESC`,
		[startupId],
	);
	return result.rows;
};

exports.findByUserAndContext = async (userId, contextType, contextId) => {
	const result = await pool.query(
		`SELECT * FROM documents
     WHERE user_id = $1 AND context_type = $2
       AND ($3::integer IS NULL OR context_id IS NOT DISTINCT FROM $3::integer)
     ORDER BY created_at DESC`,
		[userId, contextType, contextId],
	);
	return result.rows;
};

exports.deleteById = async (documentId) => {
	const result = await pool.query("DELETE FROM documents WHERE document_id = $1 RETURNING *", [
		documentId,
	]);
	return result.rows[0] || null;
};

exports.update = async (documentId, updates) => {
	const fields = Object.keys(updates);
	const values = Object.values(updates);
	if (fields.length === 0) return null;
	const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
	values.push(documentId);
	const result = await pool.query(
		`UPDATE documents SET ${setClause} WHERE document_id = $${fields.length + 1}
		 RETURNING *`,
		values,
	);
	return result.rows[0] || null;
};
