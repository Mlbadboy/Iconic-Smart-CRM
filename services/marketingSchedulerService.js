const mongoose = require('mongoose');
const SocialPost = require('../models/SocialPost');
const MetaAccount = require('../models/MetaAccount');
const { publishToFacebookPage, publishToInstagram } = require('./metaService');
const { logMarketingEvent } = require('./marketingAuditService');
const logger = require('./logger');

let schedulerInterval = null;
let isSchedulerRunning = false;

/**
 * Checks for scheduled posts/reels that have reached their scheduled time and publishes them
 */
async function processScheduledSocialPosts() {
  if (isSchedulerRunning) return;
  if (mongoose.connection.readyState !== 1) return;
  isSchedulerRunning = true;

  try {
    const now = new Date();
    const pendingPosts = await SocialPost.find({
      status: 'SCHEDULED',
      scheduledAt: { $lte: now }
    }).limit(10);

    for (const post of pendingPosts) {
      try {
        post.status = 'PUBLISHING';
        await post.save();

        const metaAccount = await MetaAccount.findOne({ companyId: post.companyId })
          .select('+encryptedUserAccessToken');

        if (!metaAccount) {
          post.status = 'FAILED';
          post.errorMessage = 'No connected Meta Business Account found for tenant';
          await post.save();
          continue;
        }

        const externalIds = { ...post.externalMetaIds };

        // Publish to Facebook if selected
        if (post.platforms.includes('FACEBOOK') && metaAccount.selectedPageId) {
          const fbRes = await publishToFacebookPage(metaAccount.selectedPageId, 'mock_page_token', {
            caption: post.caption,
            mediaUrls: post.mediaUrls
          });
          externalIds.facebookPostId = fbRes.postId;
        }

        // Publish to Instagram if selected
        if (post.platforms.includes('INSTAGRAM') && metaAccount.selectedInstagramId) {
          const igRes = await publishToInstagram(metaAccount.selectedInstagramId, 'mock_user_token', {
            caption: post.caption,
            mediaUrls: post.mediaUrls,
            postType: post.postType,
            coverImageUrl: post.coverImageUrl
          });
          externalIds.instagramMediaId = igRes.mediaId;
        }

        post.status = 'PUBLISHED';
        post.publishedAt = new Date();
        post.externalMetaIds = externalIds;
        await post.save();

        await logMarketingEvent({
          companyId: post.companyId,
          userId: post.createdBy,
          action: 'POST_SCHEDULED_PUBLISHED',
          channel: post.platforms.includes('INSTAGRAM') ? 'INSTAGRAM' : 'FACEBOOK',
          targetType: 'SocialPost',
          targetId: post._id,
          targetTitle: post.title,
          newState: 'PUBLISHED',
          externalId: externalIds.facebookPostId || externalIds.instagramMediaId
        });

        logger.info(`🚀 [Scheduler] Auto-published scheduled post: "${post.title}" (${post._id})`);
      } catch (postErr) {
        post.status = 'FAILED';
        post.errorMessage = postErr.message;
        await post.save();
        logger.error(`❌ [Scheduler] Failed to publish scheduled post ${post._id}:`, postErr);
      }
    }
  } catch (err) {
    logger.error('Error in marketing scheduler tick:', err);
  } finally {
    isSchedulerRunning = false;
  }
}

function startMarketingScheduler(intervalMs = 15000) {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(processScheduledSocialPosts, intervalMs);
  logger.info(`⏰ Social Marketing Scheduler initialized (polling every ${intervalMs / 1000}s)`);
}

function stopMarketingScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

module.exports = {
  processScheduledSocialPosts,
  startMarketingScheduler,
  stopMarketingScheduler
};
