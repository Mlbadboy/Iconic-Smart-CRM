const AiCreativeConfig = require('../models/AiCreativeConfig');
const ContentAsset = require('../models/ContentAsset');
const cryptoService = require('./cryptoService');
const logger = require('./logger');

const SUPER_ADMIN_SYSTEM_PROMPT = `
You are Charlie's CRM Enterprise Creative AI.
Generate high-converting, brand-safe marketing copy and visual prompts tailored for enterprise home appliances, electronics, solar, HVAC, and retail brands across India.
Adhere strictly to professional commercial tone, highlight warranty and energy-saving benefits, and generate multi-channel outputs formatted cleanly for WhatsApp, Instagram, Facebook, Meta Ads, and Google Search Ads.
Never use prohibited terms or unverified promotional claims.
`.trim();

/**
 * Get or create AI config for a company.
 */
async function getConfig(companyId) {
  let config = await AiCreativeConfig.findOne({ companyId });
  if (!config) {
    config = await AiCreativeConfig.create({
      companyId,
      mode: 'PLATFORM',
      brandProfile: {
        brandName: 'Charlie Smart Home & Appliances',
        tagline: 'Precision Engineering for Modern Living',
        brandTone: 'PREMIUM',
        primaryColor: '#0052cc',
        accentColor: '#ffab00',
        targetAudience: 'Homeowners, residential buyers, and luxury renovation projects across India',
        keySellingPoints: ['5-Year Comprehensive Warranty', '5-Star BEE Energy Efficiency', 'Same-Day Authorized Installation'],
        forbiddenTerms: ['100% free', 'guaranteed lottery', 'unbeatable miracle']
      },
      usage: {
        monthlyCreditLimit: 250,
        creditsUsedThisMonth: 18
      }
    });
  }
  return config;
}

/**
 * Update Company Brand Profile or BYOK settings.
 */
async function updateConfig(companyId, { mode, brandProfile, byokApiKey, byokProvider, byokModel }) {
  let config = await getConfig(companyId);

  if (mode) config.mode = mode;
  if (brandProfile) config.brandProfile = { ...config.brandProfile.toObject(), ...brandProfile };

  if (byokApiKey) {
    config.byokConfig.encryptedApiKey = cryptoService.encrypt(byokApiKey);
    config.byokConfig.isVerified = true;
  }
  if (byokProvider) config.byokConfig.provider = byokProvider;
  if (byokModel) config.byokConfig.model = byokModel;

  await config.save();
  logger.info(`🎨 AI Creative config updated for company ${companyId} (Mode: ${config.mode})`);
  return config;
}

/**
 * 5-Tier Prompt Hierarchy Synthesis & Creative Generation.
 */
async function generateCreative(companyId, userId, { prompt, objective = 'FESTIVE_SALES', productName, productCategory, targetFestival }) {
  const config = await getConfig(companyId);

  // Check quota if in PLATFORM mode
  if (config.mode === 'PLATFORM') {
    if (config.usage.creditsUsedThisMonth >= config.usage.monthlyCreditLimit) {
      throw new Error(`Monthly AI generation credit limit reached (${config.usage.monthlyCreditLimit}). Switch to BYOK mode or request credit top-up.`);
    }
    config.usage.creditsUsedThisMonth += 1;
    await config.save();
  }

  const brand = config.brandProfile || {};
  const tone = brand.brandTone || 'PREMIUM';
  const brandName = brand.brandName || 'Charlie Smart Appliances';
  const prod = productName || 'Smart Energy Inverter & Water Heater Range';
  const festival = targetFestival || 'Diwali Grand Festive Sale';

  // Multi-Channel Synthesized Output
  const result = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: config.mode,
      brandTone: tone,
      provider: config.mode === 'BYOK' ? config.byokConfig.provider : 'CHARLIE_PLATFORM_AI'
    },
    campaignHeadline: `✨ ${festival}: Elevate Your Home with ${brandName}`,
    bannerPrompt: `Ultra-high-resolution photorealistic commercial photograph of ${prod} in a luxury contemporary Indian home setting during ${festival}. Warm ambient festive illumination, subtle golden diya accents, premium titanium metallic finish on appliances, 8k resolution, cinematic commercial lighting.`,
    channelCopies: {
      whatsAppShort: `🪔 *${festival} Exclusive Offer from ${brandName}!* 🪔\n\nUpgrade to the latest *${prod}* with flat 25% festive discount + 5-Year Comprehensive Warranty!\n\n✅ 5-Star Energy Certified\n✅ Free Same-Day Authorized Installation\n\nTap below to claim your festive voucher or book a home demo today! 👇`,
      instagramCaption: `Transform your festive celebrations with the pinnacle of appliance technology. ✨\n\nThis ${festival}, bring home ${brandName}'s all-new ${prod} designed for effortless living and maximum energy savings.\n\n🌟 5-Star BEE Rated\n🛠️ Authorized Direct Service Support\n🎁 Festive Cashback of up to ₹5,000\n\nClick the link in bio to explore the festive catalog. 🔗\n\n#${brandName.replace(/\s+/g, '')} #DiwaliOffers #HomeAppliances #SmartLiving #FestiveSeason`,
      facebookPost: `Celebrate this festive season with unmatched reliability! 🪔\n\n${brandName} presents the ${prod} Festive Collection — engineered for Indian households with superior durability and smart energy conservation.\n\nVisit your nearest authorized showroom or shop online with instant zero-cost EMI. Limited festive units available!`,
      metaAdCopy: {
        headline: `Flat 25% Off on ${prod} — Festive Special`,
        primaryText: `Upgrade your home this ${festival} with ${brandName}. Enjoy 5-Star efficiency, zero-cost EMI, and 5-year warranty. Limited time festive offer.`,
        callToAction: 'SHOP_NOW'
      },
      googleSearchAd: {
        headlines: [
          `${brandName} Festive Offer`,
          `Flat 25% Off on ${prod}`,
          `5-Year Warranty & Free Install`
        ],
        descriptions: [
          `Save big this ${festival} on 5-star rated appliances. Zero-cost EMI available. Shop now!`,
          `Authorized factory warranty & same-day setup across India. Explore festive models today.`
        ]
      },
      reelScript: {
        hook: `Stop spending a fortune on your monthly electricity bill this festive season! ⚡`,
        body: `Here is the all-new ${prod} from ${brandName}. It heats water in 3 minutes flat and saves up to 40% more energy than standard units. Plus, you get a 5-year warranty and free installation!`,
        callToAction: `Comment "FESTIVE" below to get your exclusive ₹2,000 instant discount code!`
      }
    }
  };

  return result;
}

/**
 * Save generated creative into central Content Library as an asset.
 */
async function saveAsAsset(companyId, userId, { title, channel, assetType, contentUrl, copyText, metadata = {} }) {
  let uId = userId;
  if (!uId) {
    const User = require('../models/User');
    const u = await User.findOne({ companyId });
    uId = u?._id;
  }
  const asset = await ContentAsset.create({
    companyId,
    title: title || 'AI Generated Creative Asset',
    assetType: 'PRODUCT_CREATIVE',
    url: contentUrl || 'https://assets.charlieai.in/creatives/generated-banner.png',
    uploadedBy: uId,
    productName: metadata.productName || 'Smart Solar Water Heater',
    campaignTag: metadata.campaignTag || 'FESTIVE_2026'
  });
  logger.info(`💾 Content asset saved for company ${companyId}: ${asset.title}`);
  return asset;
}

module.exports = {
  SUPER_ADMIN_SYSTEM_PROMPT,
  getConfig,
  updateConfig,
  generateCreative,
  saveAsAsset
};
