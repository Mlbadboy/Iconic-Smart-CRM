const crypto = require('crypto');
const Webhook = require('../models/Webhook');

class WebhookService {
  // Trigger webhook for an event
  static async triggerWebhooks(eventType, data) {
    try {
      // Find all active webhooks for this event
      const webhooks = await Webhook.find({
        active: true,
        events: eventType
      });
    

      // Deliver to each webhook
      const deliveryPromises = webhooks.map(webhook => 
        this.deliverWebhook(webhook, eventType, data)
      );

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error('Webhook trigger error:', error);
    }
  }

  // Deliver webhook with retry logic
  static async deliverWebhook(webhook, eventType, data, retryCount = 0) {
    try {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: data
      };

      // Generate signature for verification
      const signature = this.generateSignature(webhook.secret, payload);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': webhook._id.toString(),
        ...Object.fromEntries(webhook.headers || [])
      };

      // Make HTTP request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        timeout: 10000  // 10 second timeout
      });

      if (response.ok) {
        // Success
        await Webhook.findByIdAndUpdate(webhook._id, {
          $inc: { 
            'stats.totalDeliveries': 1,
            'stats.successfulDeliveries': 1 
          },
          $set: {
            'stats.lastDelivery': new Date(),
            'stats.lastSuccess': new Date()
          }
        });
        
        console.log(`Webhook delivered successfully to ${webhook.url}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`Webhook delivery failed: ${error.message}`);

      // Retry logic
      if (retryCount < webhook.retryPolicy.maxRetries) {
        console.log(`Retrying webhook delivery (attempt ${retryCount + 1}/${webhook.retryPolicy.maxRetries})`);
        
        await new Promise(resolve => 
          setTimeout(resolve, webhook.retryPolicy.retryDelay)
        );
        
        return this.deliverWebhook(webhook, eventType, data, retryCount + 1);
      }

      // Update failure stats
      await Webhook.findByIdAndUpdate(webhook._id, {
        $inc: { 
          'stats.totalDeliveries': 1,
          'stats.failedDeliveries': 1 
        },
        $set: {
          'stats.lastDelivery': new Date(),
          'stats.lastFailure': new Date()
        }
      });

      return false;
    }
  }

  // Generate HMAC signature for webhook verification
  static generateSignature(secret, payload) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  // Verify webhook signature (for webhook receivers)
  static verifySignature(secret, payload, signature) {
    const expectedSignature = this.generateSignature(secret, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = WebhookService;
