const resourceService = require("../services/resourceService");
const activityService = require("../services/activityService");

exports.uploadResource = async (req, res) => {
  try {
    const { user_id: userId } = req.user;
    const {
      relationship_type,
      relationship_id,
      title,
      description,
      resource_type,
      external_url,
      visibility,
    } = req.body || {};
    const file = req.file || null;
    const resource = await resourceService.createResource({
      userId,
      relationshipType: relationship_type,
      relationshipId: Number(relationship_id),
      title,
      description,
      resourceType: resource_type,
      file,
      externalUrl: external_url,
      visibility,
    });

    // log activity
    try {
      await activityService.recordActivity({
        userId,
        activityType: "resource_shared",
        entityType: "shared_resources",
        entityId: resource.resource_id,
        metadata: { relationship_type, relationship_id },
      });
    } catch (e) {}

    return res.status(201).json({ resource });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.listResources = async (req, res) => {
  try {
    const { relationship_type, relationship_id } = req.query || {};
    if (!relationship_type || !relationship_id)
      return res.status(400).json({ error: "relationship_type and relationship_id are required" });
    const rows = await resourceService.listResourcesForRelationship({
      relationshipType: relationship_type,
      relationshipId: Number(relationship_id),
    });
    return res.status(200).json({ resources: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getResource = async (req, res) => {
  try {
    const id = Number(req.params.resourceId);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const r = await resourceService.getResourceById({ resourceId: id });
    if (!r) return res.status(404).json({ error: "Resource not found" });
    return res.status(200).json({ resource: r });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
