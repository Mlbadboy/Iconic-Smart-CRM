const express = require('express');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { createTask, completeTask, getTasksForUser } = require('../services/taskService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

// Get tasks
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const tasks = await getTasksForUser(req.user.id, req.user.role, filter);
    return success(res, tasks);
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// Create task
router.post('/', auth, requirePermission('lead.edit'), async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, category, relatedEntityId, relatedEntityType } = req.body;
    const task = await createTask(title, description, assignedTo || req.user.id, dueDate, priority, category, relatedEntityId, relatedEntityType);
    return success(res, task);
  } catch (err) {
    return error(res, { status: 400, message: err.message });
  }
});

// Complete task
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const task = await completeTask(req.params.id);
    return success(res, task);
  } catch (err) {
    return error(res, { status: 400, message: err.message });
  }
});

module.exports = router;
