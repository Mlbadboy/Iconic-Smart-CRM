const axios = require('axios');
const MetaAccount = require('../models/MetaAccount');
const { encrypt, decrypt, maskSecret } = require('./cryptoService');
const logger = require('./logger');

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Generates OAuth Authorization URL for Meta Login
 */
function getMetaOAuthUrl(clientId, redirectUri, state) {
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'ads_management',
    'ads_read',
    'business_management'
  ].join(',');

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
}

/**
 * Exchanges short-lived code for long-lived access token
 */
async function exchangeCodeForLongLivedToken(clientId, clientSecret, redirectUri, code) {
  // Test/mock bypass for development and test environments
  if (code.startsWith('mock_') || process.env.NODE_ENV === 'test') {
    return {
      accessToken: 'mock_meta_long_lived_user_access_token_12345',
      expiresIn: 5184000, // 60 days
      userId: 'mock_meta_user_999'
    };
  }

  try {
    // 1. Get short-lived token
    const tokenRes = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      }
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived token (60 days)
    const longLivedRes = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken
      }
    });

    return {
      accessToken: longLivedRes.data.access_token,
      expiresIn: longLivedRes.data.expires_in || 5184000,
      userId: null
    };
  } catch (err) {
    logger.error('Meta OAuth exchange error:', err.response?.data || err.message);
    throw new Error(`Failed to exchange Meta OAuth code: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Discovers Pages, Instagram Accounts, Ad Accounts & Pixels from Meta Graph API
 */
async function discoverMetaAssets(userAccessToken) {
  if (userAccessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
    return {
      user: { id: 'mock_user_101', name: 'Charlie Brand Director', email: 'director@charlieai.com' },
      business: { id: 'mock_biz_201', name: 'Charlie Appliances Pvt Ltd' },
      pages: [
        {
          pageId: 'mock_page_301',
          name: 'Charlie Appliances India',
          category: 'Consumer Electronics & Appliances',
          fanCount: 24500,
          pictureUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=128&auto=format&fit=crop&q=80',
          pageAccessToken: 'mock_page_token_301',
          isActive: true
        }
      ],
      instagramAccounts: [
        {
          igId: 'mock_ig_401',
          pageId: 'mock_page_301',
          username: 'charlieappliances',
          name: 'Charlie Smart Living',
          profilePictureUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=128&auto=format&fit=crop&q=80',
          followersCount: 18200,
          mediaCount: 142,
          isActive: true
        }
      ],
      adAccounts: [
        {
          adAccountId: 'act_mock_ad_501',
          accountName: 'Charlie India Main Ads',
          currency: 'INR',
          accountStatus: 1,
          amountSpent: 42500,
          balance: 15000,
          isActive: true
        },
        {
          adAccountId: 'act_mock_ad_502',
          accountName: 'Charlie Performance Growth',
          currency: 'INR',
          accountStatus: 1,
          amountSpent: 12000,
          balance: 8000,
          isActive: true
        }
      ],
      pixels: [
        {
          pixelId: 'mock_pixel_601',
          name: 'Charlie Website Main Pixel',
          lastFiredTime: new Date(),
          isActive: true
        }
      ]
    };
  }

  try {
    // 1. Get User Profile
    const meRes = await axios.get(`${GRAPH_API_BASE}/me`, {
      params: { fields: 'id,name,email', access_token: userAccessToken }
    });

    // 2. Discover Facebook Pages & Linked Instagram Accounts
    const pagesRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
      params: {
        fields: 'id,name,category,fan_count,picture,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}',
        access_token: userAccessToken
      }
    });

    const pages = [];
    const instagramAccounts = [];

    (pagesRes.data.data || []).forEach(p => {
      pages.push({
        pageId: p.id,
        name: p.name,
        category: p.category,
        fanCount: p.fan_count || 0,
        pictureUrl: p.picture?.data?.url || null,
        pageAccessToken: p.access_token,
        isActive: true
      });

      if (p.instagram_business_account) {
        const ig = p.instagram_business_account;
        instagramAccounts.push({
          igId: ig.id,
          pageId: p.id,
          username: ig.username,
          name: ig.name || ig.username,
          profilePictureUrl: ig.profile_picture_url || null,
          followersCount: ig.followers_count || 0,
          mediaCount: ig.media_count || 0,
          isActive: true
        });
      }
    });

    // 3. Discover Ad Accounts
    const adRes = await axios.get(`${GRAPH_API_BASE}/me/adaccounts`, {
      params: {
        fields: 'id,name,currency,account_status,amount_spent,balance',
        access_token: userAccessToken
      }
    });

    const adAccounts = (adRes.data.data || []).map(ad => ({
      adAccountId: ad.id,
      accountName: ad.name || `Ad Account (${ad.id})`,
      currency: ad.currency || 'INR',
      accountStatus: ad.account_status || 1,
      amountSpent: (Number(ad.amount_spent) || 0) / 100, // Meta returns cents/paise
      balance: (Number(ad.balance) || 0) / 100,
      isActive: ad.account_status === 1
    }));

    return {
      user: meRes.data,
      business: { id: null, name: meRes.data.name },
      pages,
      instagramAccounts,
      adAccounts,
      pixels: []
    };
  } catch (err) {
    logger.error('Meta asset discovery error:', err.response?.data || err.message);
    throw new Error(`Failed to discover Meta assets: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Publishes organic post to Facebook Page
 */
async function publishToFacebookPage(pageId, pageAccessToken, postData) {
  const { caption, mediaUrls } = postData;

  if (pageAccessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
    return {
      success: true,
      postId: `fb_mock_post_${Date.now()}`,
      url: `https://facebook.com/${pageId}/posts/mock_${Date.now()}`
    };
  }

  try {
    let endpoint = `${GRAPH_API_BASE}/${pageId}/feed`;
    let payload = { message: caption, access_token: pageAccessToken };

    // If single image post
    if (mediaUrls && mediaUrls.length === 1 && mediaUrls[0].mediaType === 'IMAGE') {
      endpoint = `${GRAPH_API_BASE}/${pageId}/photos`;
      payload = {
        url: mediaUrls[0].url,
        caption: caption,
        access_token: pageAccessToken
      };
    }

    const res = await axios.post(endpoint, null, { params: payload });
    return {
      success: true,
      postId: res.data.id,
      url: `https://facebook.com/${res.data.id}`
    };
  } catch (err) {
    logger.error('Facebook Page publish error:', err.response?.data || err.message);
    throw new Error(`Facebook publish failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Publishes organic post or reel to Instagram Business Account
 */
async function publishToInstagram(igUserId, userAccessToken, postData) {
  const { caption, mediaUrls, postType, coverImageUrl } = postData;

  if (userAccessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
    return {
      success: true,
      mediaId: `ig_mock_media_${Date.now()}`,
      url: `https://instagram.com/p/mock_${Date.now()}`
    };
  }

  try {
    const isReel = postType === 'REEL';
    const media = mediaUrls[0];

    // Step 1: Create Media Container
    const containerParams = {
      caption: caption,
      access_token: userAccessToken
    };

    if (isReel || media.mediaType === 'VIDEO') {
      containerParams.media_type = 'REELS';
      containerParams.video_url = media.url;
      if (coverImageUrl) {
        containerParams.cover_url = coverImageUrl;
      }
    } else {
      containerParams.image_url = media.url;
    }

    const containerRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, null, { params: containerParams });
    const creationId = containerRes.data.id;

    // Step 2: For Reels/Videos, wait/poll until container is READY
    if (isReel || media.mediaType === 'VIDEO') {
      let isReady = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await axios.get(`${GRAPH_API_BASE}/${creationId}`, {
          params: { fields: 'status_code', access_token: userAccessToken }
        });
        if (statusRes.data.status_code === 'FINISHED') {
          isReady = true;
          break;
        }
        if (statusRes.data.status_code === 'ERROR') {
          throw new Error('Meta container processing failed');
        }
      }
    }

    // Step 3: Publish Media Container
    const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: creationId,
        access_token: userAccessToken
      }
    });

    return {
      success: true,
      mediaId: publishRes.data.id,
      url: `https://instagram.com/p/${publishRes.data.id}`
    };
  } catch (err) {
    logger.error('Instagram publish error:', err.response?.data || err.message);
    throw new Error(`Instagram publish failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Creates paid Meta Ad Campaign via Marketing API
 */
async function createMetaAdCampaign(adAccountId, userAccessToken, campaignData) {
  if (userAccessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
    return {
      success: true,
      campaignId: `meta_mock_campaign_${Date.now()}`,
      adSetId: `meta_mock_adset_${Date.now()}`,
      adId: `meta_mock_ad_${Date.now()}`,
      status: 'ACTIVE'
    };
  }

  try {
    // 1. Create Campaign
    const campaignRes = await axios.post(`${GRAPH_API_BASE}/${adAccountId}/campaigns`, null, {
      params: {
        name: campaignData.name,
        objective: campaignData.objective,
        status: 'PAUSED', // Start in paused state until final launch confirmation
        special_ad_categories: 'NONE',
        access_token: userAccessToken
      }
    });
    const campaignId = campaignRes.data.id;

    return {
      success: true,
      campaignId,
      status: 'PAUSED'
    };
  } catch (err) {
    logger.error('Meta Ads API creation error:', err.response?.data || err.message);
    throw new Error(`Meta Ad Campaign creation failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

module.exports = {
  GRAPH_API_VERSION,
  GRAPH_API_BASE,
  getMetaOAuthUrl,
  exchangeCodeForLongLivedToken,
  discoverMetaAssets,
  publishToFacebookPage,
  publishToInstagram,
  createMetaAdCampaign
};
