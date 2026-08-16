const Task = require('../models/Task');
const logger = require('./logger');

async function createTask(title, description, assignedTo, dueDate, priority = 'medium', category, relatedEntityId, relatedEntityType) {
  try {
    const task = new Task({
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      category,
      relatedEntityId,
      relatedEntityType,
      status: 'pending'
    });

    await task.save();
    logger.info(`📋 Task "${title}" created for user ${assignedTo}`);
    return task;
  } catch (error) {
    logger.error('Error creating task:', error);
    throw error;
  }
}

async function completeTask(taskId) {
  try {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');

    task.status = 'completed';
    await task.save();
    logger.info(`📋 Task "${task.title}" completed`);
    return task;
  } catch (error) {
    logger.error('Error completing task:', error);
    throw error;
  }
}

async function getTasksForUser(userId, role, queryFilters = {}) {
  try {
    const filter = { ...queryFilters };
    
    // Non-managers can only see their own tasks
    if (role !== 'admin' && role !== 'administrator' && !role.includes('manager')) {
      filter.assignedTo = userId;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .sort({ dueDate: 1 })
      .limit(100);
      
    return tasks;
  } catch (error) {
    logger.error('Error getting tasks:', error);
    throw error;
  }
}

module.exports = {
  createTask,
  completeTask,
  getTasksForUser
};
