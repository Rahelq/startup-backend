const projectWorkflowService = require("../services/projectWorkflowService");

async function run(res, operation) {
  try {
    const result = await operation();
    return res.status(result.status || 200).json(result.data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

exports.createProject = async (req, res) =>
  run(res, () =>
    projectWorkflowService.createProject({
      userId: req.user.user_id,
      body: req.body,
    })
  );

exports.getProject = async (req, res) =>
  run(res, () =>
    projectWorkflowService.getProject({
      projectId: req.params.projectId,
    })
  );

exports.createMilestone = async (req, res) =>
  run(res, () =>
    projectWorkflowService.createMilestone({
      userId: req.user.user_id,
      projectId: req.params.projectId,
      body: req.body,
    })
  );

exports.updateMilestoneStatus = async (req, res) =>
  run(res, () =>
    projectWorkflowService.updateMilestoneStatus({
      userId: req.user.user_id,
      milestoneId: req.params.milestoneId,
      body: req.body,
    })
  );

exports.uploadProjectDocument = async (req, res) =>
  run(res, () =>
    projectWorkflowService.uploadProjectDocument({
      userId: req.user.user_id,
      projectId: req.params.projectId,
      body: req.body,
    })
  );

exports.getProjectDocuments = async (req, res) =>
  run(res, () =>
    projectWorkflowService.getProjectDocuments({
      projectId: req.params.projectId,
    })
  );

exports.updateProjectStatus = async (req, res) =>
  run(res, () =>
    projectWorkflowService.updateProjectStatus({
      userId: req.user.user_id,
      role: req.user.role,
      projectId: req.params.projectId,
      body: req.body,
    })
  );

exports.getStartupProjects = async (req, res) =>
  run(res, () =>
    projectWorkflowService.getStartupProjects({
      userId: req.user.user_id,
    })
  );

exports.getAllProjects = async (req, res) =>
  run(res, () =>
    projectWorkflowService.getAllProjects({
      query: req.query,
    })
  );

exports.getProjectMilestones = async (req, res) =>
  run(res, () =>
    projectWorkflowService.getProjectMilestones({
      projectId: req.params.projectId,
    })
  );

// Phase 3: project activity endpoints
const projectActivityService = require("../services/projectActivityService");

exports.recordProjectActivity = async (req, res) =>
  run(res, () =>
    (async () => {
      const userId = req.user.user_id;
      const projectId = Number(req.params.projectId || req.body.project_id);
      const { action, metadata } = req.body || {};
      const rec = await projectActivityService.recordActivity({
        userId,
        projectId,
        action,
        metadata,
      });
      return { status: 201, data: { message: "Activity recorded", activity: rec } };
    })()
  );

exports.listProjectActivity = async (req, res) =>
  run(res, () =>
    (async () => {
      const userId = req.user.user_id;
      const projectId = Number(req.params.projectId || req.query.project_id);
      const rows = await projectActivityService.listActivity({ userId, projectId });
      return { status: 200, data: { activities: rows } };
    })()
  );
