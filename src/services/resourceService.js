const pool = require("../config/db");
const documentUploadService = require("./documentUploadService");
const notificationService = require("./notificationService");

exports.createResource = async ({
  userId,
  relationshipType,
  relationshipId,
  title,
  description,
  resourceType,
  file,
  externalUrl,
  visibility,
}) => {
  if (!relationshipType || !relationshipId) {
    const err = new Error("relationship_type and relationship_id are required");
    err.status = 400;
    throw err;
  }
  let fileUrl = null;
  let publicId = null;
  let mimeType = null;
  let fileName = null;
  let fileSize = null;

  if (file) {
    // save to cloudinary via documentUploadService
    const saved = await documentUploadService.saveUploadedFile(file, {
      userId,
      documentType: "resource",
      contextType: "resource",
      contextId: null,
      description: description || null,
    });
    fileUrl = saved.file_url || saved.file_path || null;
    publicId = saved.public_id || null;
    mimeType = saved.mime_type || null;
    fileName = saved.original_name || (file && file.originalname) || null;
    fileSize = saved.file_size || (file && file.size) || null;
    resourceType =
      resourceType ||
      (file && (file.mimetype && file.mimetype.startsWith("image/") ? "image" : "file"));
  } else if (externalUrl) {
    fileUrl = externalUrl;
    resourceType = resourceType || "link";
  }

  const res = await pool.query(
    `INSERT INTO shared_resources (relationship_id, relationship_type, uploaded_by, title, description, resource_type, file_url, public_id, file_name, file_size, mime_type, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      relationshipId,
      relationshipType,
      userId,
      title || null,
      description || null,
      resourceType || null,
      fileUrl,
      publicId,
      fileName,
      fileSize,
      mimeType,
      visibility || "participants",
    ]
  );

  const resource = res.rows[0];

  // notify other participant(s) depending on relationship
  try {
    // create a notification for participants (simplified)
    await notificationService.createNotification({
      userId: userId,
      notificationType: "resource_shared",
      title: "Resource shared",
      message: title || "A resource was shared",
      referenceType: "shared_resources",
      referenceId: resource.resource_id,
      metadata: { resource: resource },
    });
  } catch (e) {}

  return resource;
};

exports.listResourcesForRelationship = async ({ relationshipType, relationshipId }) => {
  const q = await pool.query(
    "SELECT * FROM shared_resources WHERE relationship_type = $1 AND relationship_id = $2 ORDER BY created_at DESC",
    [relationshipType, relationshipId]
  );
  return q.rows;
};

exports.getResourceById = async ({ resourceId }) => {
  const r = await pool.query("SELECT * FROM shared_resources WHERE resource_id = $1", [resourceId]);
  return r.rowCount ? r.rows[0] : null;
};
