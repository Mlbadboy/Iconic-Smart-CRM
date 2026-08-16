const axios = require('axios');
const WebhookQueue = require('../models/WebhookQueue');
const logger = require('./logger');

async function queueWebhook(webhookId, url, payload, correlationId = '') {
  try {
    const queueItem = new WebhookQueue({
      webhookId,
      url,
      payload,
      correlationId,
      status: 'pending',
      nextAttemptAt: new Date()
    });

    await queueItem.save();
    logger.info(`🔌 Webhook queued for ${url}. Correlation ID: ${correlationId}`);
    return queueItem;
  } catch (error) {
    logger.error('Error queuing webhook:', error);
    throw error;
  }
}

async function processQueue() {
  try {
    const now = new Date();
    const items = await WebhookQueue.find({
      status: 'pending',
      nextAttemptAt: { $lte: now }
    }).limit(10);

    for (const item of items) {
      item.status = 'processing';
      await item.save();

      try {
        logger.info(`🔌 Dispatching webhook to ${item.url} (Attempt ${item.retryCount + 1})...`);
        
        await axios.post(item.url, item.payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': item.correlationId || '',
            'X-Webhook-Delivery-ID': item._id.toString()
          },
          timeout: 5000
        });

        item.status = 'completed';
        logger.info(`🔌 Webhook to ${item.url} delivered successfully`);
      } catch (err) {
        item.retryCount += 1;
        item.lastError = err.message;

        if (item.retryCount >= item.maxRetries) {
          item.status = 'failed';
          logger.error(`🔌 Webhook to ${item.url} failed permanently after ${item.maxRetries} attempts. Error: ${err.message}`);
        } else {
          item.status = 'pending';
          // Exponential backoff: 5s, 10s, 20s, 40s...
          const backoffSec = 5 * Math.pow(2, item.retryCount - 1);
          item.nextAttemptAt = new Date(Date.now() + backoffSec * 1000);
          logger.warn(`🔌 Webhook to ${item.url} failed. Retrying in ${backoffSec}s. Error: ${err.message}`);
        }
      }

      await item.save();
    }
  } catch (error) {
    logger.error('Error processing webhook queue:', error);
  }
}

module.exports = {
  queueWebhook,
  processQueue
};
