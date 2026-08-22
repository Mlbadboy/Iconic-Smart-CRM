const MarketingHoliday = require('../models/MarketingHoliday');
const MarketingCampaignPlan = require('../models/MarketingCampaignPlan');
const logger = require('./logger');

const DEFAULT_INDIAN_HOLIDAYS = [
  {
    name: 'Republic Day Celebration Sale',
    month: 1,
    day: 26,
    category: 'NATIONAL',
    businessRelevance: 'HIGH',
    description: 'National patriotic holiday with high retail electronics & home appliance shopping surge.',
    suggestedThemes: ['Patriotic Discounts', 'Freedom from Heat / Hard Water', 'Proudly Made in India Special'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'FACEBOOK', 'META_ADS'],
    campaignBlueprint: [
      { phaseOffsetDays: -7, channel: 'INSTAGRAM_POST', actionType: 'TEASER', suggestedTitle: 'Republic Day Sale Teaser', suggestedCopyPrompt: 'Announce 26% off on all smart home appliances starting this Republic Day.' },
      { phaseOffsetDays: -5, channel: 'FACEBOOK', actionType: 'MAIN_OFFER', suggestedTitle: 'Republic Mega Deal Reveal', suggestedCopyPrompt: 'Exclusive Republic Day exchange bonus on Water Heaters and Smart ROs.' },
      { phaseOffsetDays: -3, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Republic Day Performance Ad', suggestedCopyPrompt: 'Target homeowners looking for premium kitchen upgrades with Republic Day offers.' },
      { phaseOffsetDays: -1, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'VIP WhatsApp Early Access', suggestedCopyPrompt: 'Exclusive preview coupon for registered customers.' },
      { phaseOffsetDays: 0, channel: 'INSTAGRAM_REEL', actionType: 'REEL_SHOWCASE', suggestedTitle: 'Republic Day Feature Showcase', suggestedCopyPrompt: 'Showcase durable build quality with national pride theme.' }
    ]
  },
  {
    name: 'Maha Shivratri Festive Blessing',
    month: 2,
    day: 18,
    category: 'FESTIVAL',
    businessRelevance: 'MEDIUM',
    description: 'Auspicious festival celebration across North, West and South India.',
    suggestedThemes: ['Purity of Water', 'Health & Wellness Blessing', 'Clean Living'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'FACEBOOK'],
    campaignBlueprint: [
      { phaseOffsetDays: -3, channel: 'INSTAGRAM_POST', actionType: 'TEASER', suggestedTitle: 'Purity for Shivratri', suggestedCopyPrompt: 'Celebrate the auspicious day with 100% pure drinking water from Smart RO.' },
      { phaseOffsetDays: 0, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Shivratri Greetings & Free Service Checkup', suggestedCopyPrompt: 'Wishing you a blessed Shivratri + complimentary filter health checkup.' }
    ]
  },
  {
    name: 'Holi Festival of Colors Sale',
    month: 3,
    day: 25,
    category: 'FESTIVAL',
    businessRelevance: 'HIGH',
    description: 'Vibrant spring festival with heavy demand for water purifiers, washing machines & geysers.',
    suggestedThemes: ['Safe Colors, Pure Water', 'Instant Hot Water Post-Holi', 'Festive Splash Deals'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS'],
    campaignBlueprint: [
      { phaseOffsetDays: -10, channel: 'INSTAGRAM_REEL', actionType: 'REEL_SHOWCASE', suggestedTitle: 'Holi Water Care Reel', suggestedCopyPrompt: 'Fun reel highlighting how easy post-Holi cleanup is with instant hot water.' },
      { phaseOffsetDays: -6, channel: 'FACEBOOK', actionType: 'MAIN_OFFER', suggestedTitle: 'Holi Rangotsav Flash Sale', suggestedCopyPrompt: 'Get up to ₹3,000 festive exchange bonus on water heaters.' },
      { phaseOffsetDays: -4, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Holi Special Lead Ad', suggestedCopyPrompt: 'Book home demo before Holi and get free installation.' },
      { phaseOffsetDays: -1, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Holi VIP Broadcast', suggestedCopyPrompt: 'Warm Holi greetings + exclusive 48-hour festive discount code.' },
      { phaseOffsetDays: 1, channel: 'WHATSAPP', actionType: 'REMINDER', suggestedTitle: 'Last Day Holi Offer Reminder', suggestedCopyPrompt: 'Reminder: Holi festive offers expire tonight at midnight.' }
    ]
  },
  {
    name: 'Akshaya Tritiya Auspicious Buying',
    month: 4,
    day: 22,
    category: 'FESTIVAL',
    businessRelevance: 'HIGH',
    description: 'Gold-standard auspicious shopping day in India for buying long-term durable assets and home appliances.',
    suggestedThemes: ['Shubh Muhurat Shopping', 'Invest in Lifelong Health', 'Prosperity at Home'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'META_ADS', 'FACEBOOK'],
    campaignBlueprint: [
      { phaseOffsetDays: -5, channel: 'FACEBOOK', actionType: 'TEASER', suggestedTitle: 'Akshaya Tritiya Shubh Deals', suggestedCopyPrompt: 'Bring prosperity home with certified 10-year warranty appliances.' },
      { phaseOffsetDays: -2, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Akshaya Tritiya VIP Invite', suggestedCopyPrompt: 'Book your Shubh Muhurat delivery on WhatsApp.' },
      { phaseOffsetDays: 0, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Today Only Auspicious Offer', suggestedCopyPrompt: 'Zero down-payment festive EMI on all appliances.' }
    ]
  },
  {
    name: 'Independence Day Mega Freedom Sale',
    month: 8,
    day: 15,
    category: 'NATIONAL',
    businessRelevance: 'HIGH',
    description: 'Largest monsoon/pre-festive retail buying period across all electronics & appliances.',
    suggestedThemes: ['Freedom Sale', '78 Years of Innovation', 'Monsoon Health Protection'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS'],
    campaignBlueprint: [
      { phaseOffsetDays: -12, channel: 'INSTAGRAM_POST', actionType: 'TEASER', suggestedTitle: 'Freedom Sale Countdown', suggestedCopyPrompt: '12 Days to the biggest Freedom Sale of the year.' },
      { phaseOffsetDays: -8, channel: 'INSTAGRAM_REEL', actionType: 'REEL_SHOWCASE', suggestedTitle: 'Product Lineup Reel', suggestedCopyPrompt: 'Showcase entire appliance lineup with price drops.' },
      { phaseOffsetDays: -5, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Freedom Sale Performance Ads', suggestedCopyPrompt: 'Drive hyper-local showroom walk-ins and direct online bookings.' },
      { phaseOffsetDays: -2, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'WhatsApp VIP Freedom Pass', suggestedCopyPrompt: 'Show this WhatsApp message at any authorized dealer for an extra 5% off.' },
      { phaseOffsetDays: 0, channel: 'FACEBOOK', actionType: 'LAST_CALL', suggestedTitle: 'Final Day Freedom Sale', suggestedCopyPrompt: 'Last chance to grab Freedom deals before prices go up.' }
    ]
  },
  {
    name: 'Ganesh Chaturthi Utsav Campaign',
    month: 9,
    day: 19,
    category: 'FESTIVAL',
    businessRelevance: 'HIGH',
    description: 'Major 10-day festive buying season across Maharashtra, Gujarat, Goa & South India.',
    suggestedThemes: ['Bappa Aagman Deals', 'Pure Water for Modak & Prasad', 'Auspicious Home Upgrades'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS'],
    campaignBlueprint: [
      { phaseOffsetDays: -7, channel: 'INSTAGRAM_POST', actionType: 'TEASER', suggestedTitle: 'Ganeshotsav Special Announcement', suggestedCopyPrompt: 'Welcome Bappa with pure and healthy living.' },
      { phaseOffsetDays: -4, channel: 'FACEBOOK', actionType: 'MAIN_OFFER', suggestedTitle: 'Festive Combo Offers', suggestedCopyPrompt: 'Buy RO + Geyser combo and save ₹5,000 this Ganeshotsav.' },
      { phaseOffsetDays: -2, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Ganesh Chaturthi Festive Broadcast', suggestedCopyPrompt: 'Warm festive greetings + special coupon code: BAPPA2026.' },
      { phaseOffsetDays: 5, channel: 'WHATSAPP', actionType: 'REMINDER', suggestedTitle: 'Mid-Utsav Special Reminder', suggestedCopyPrompt: 'Only 5 days remaining in Ganeshotsav combo festival.' }
    ]
  },
  {
    name: 'Navratri & Durga Puja Festive Dhamaka',
    month: 10,
    day: 15,
    category: 'FESTIVAL',
    businessRelevance: 'HIGH',
    description: '9 days of joyous celebration, Garba, and major consumer purchases across India.',
    suggestedThemes: ['9 Days 9 Festive Offers', 'Festive Energy & Wellness', 'Durga Puja Special'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS'],
    campaignBlueprint: [
      { phaseOffsetDays: -8, channel: 'INSTAGRAM_REEL', actionType: 'REEL_SHOWCASE', suggestedTitle: 'Navratri Offer Kickoff Reel', suggestedCopyPrompt: 'Celebrate 9 nights of Garba with 9 exclusive appliance deals.' },
      { phaseOffsetDays: -5, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Navratri Lead Generation Ad', suggestedCopyPrompt: 'Book festive home delivery with zero installation charges.' },
      { phaseOffsetDays: 0, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Navratri Day 1 VIP Blast', suggestedCopyPrompt: 'Happy Navratri! Explore day 1 flash deals on WhatsApp.' }
    ]
  },
  {
    name: 'Diwali & Dhanteras Mega Festive Utsav',
    month: 11,
    day: 1,
    category: 'FESTIVAL',
    businessRelevance: 'HIGH',
    description: 'The single biggest retail and consumer durable sales season of the year in India.',
    suggestedThemes: ['Shubh Deepotsav Offers', 'Dhanteras Gold Standard', 'Gift of Pure Health to Family', 'Festive Lighting Deals'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS'],
    campaignBlueprint: [
      { phaseOffsetDays: -15, channel: 'INSTAGRAM_POST', actionType: 'TEASER', suggestedTitle: 'Diwali Mega Utsav Teaser', suggestedCopyPrompt: 'Get ready for Charlie\'s biggest Diwali Dhamaka offers.' },
      { phaseOffsetDays: -12, channel: 'FACEBOOK', actionType: 'MAIN_OFFER', suggestedTitle: 'Diwali Catalogue Launch', suggestedCopyPrompt: 'Explore the full Diwali 2026 festive gift collection.' },
      { phaseOffsetDays: -10, channel: 'INSTAGRAM_REEL', actionType: 'REEL_SHOWCASE', suggestedTitle: 'Dhanteras Buying Guide Reel', suggestedCopyPrompt: 'Why smart home appliances are the smartest investment this Dhanteras.' },
      { phaseOffsetDays: -7, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Diwali Mega Lead & Sales Ads', suggestedCopyPrompt: 'Massive festive discounts + 10-year warranty + free smart gift on every purchase.' },
      { phaseOffsetDays: -4, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Dhanteras WhatsApp VIP Access', suggestedCopyPrompt: 'Auspicious Dhanteras greetings + instant ₹2,000 cash discount voucher.' },
      { phaseOffsetDays: -1, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Diwali Eve Family Wishes & Flash Offer', suggestedCopyPrompt: 'Wishing you and your family a sparkling Diwali + festive gift inside.' },
      { phaseOffsetDays: 2, channel: 'WHATSAPP', actionType: 'LAST_CALL', suggestedTitle: 'Bhai Dooj Last Day Festive Reminder', suggestedCopyPrompt: 'Last 24 hours to claim Diwali festive bonuses before offers expire.' }
    ]
  },
  {
    name: 'Year-End Grand Clearance Sale',
    month: 12,
    day: 25,
    category: 'SEASONAL',
    businessRelevance: 'HIGH',
    description: 'End-of-year Christmas and New Year clearance and winter warming demand.',
    suggestedThemes: ['Year-End Price Drop', 'Winter Water Heating Deals', 'New Year New Upgrades'],
    suggestedChannels: ['WHATSAPP', 'INSTAGRAM_POST', 'META_ADS', 'FACEBOOK'],
    campaignBlueprint: [
      { phaseOffsetDays: -7, channel: 'FACEBOOK', actionType: 'MAIN_OFFER', suggestedTitle: 'Year End Price Drop', suggestedCopyPrompt: 'Clearance deals on 2026 stock before year-end.' },
      { phaseOffsetDays: -3, channel: 'META_ADS', actionType: 'AD_LAUNCH', suggestedTitle: 'Winter Heating Special Ad', suggestedCopyPrompt: 'Instant hot water for chilly winter mornings with smart geysers.' },
      { phaseOffsetDays: 0, channel: 'WHATSAPP', actionType: 'BROADCAST', suggestedTitle: 'Christmas & New Year Greetings', suggestedCopyPrompt: 'Merry Christmas! Enjoy year-end bonus savings.' }
    ]
  }
];

/**
 * Seeds default master holidays if none exist in the database
 */
async function seedDefaultHolidays() {
  try {
    const count = await MarketingHoliday.countDocuments({ isGlobalMaster: true });
    if (count > 0) return;

    const currentYear = new Date().getFullYear();
    const docs = DEFAULT_INDIAN_HOLIDAYS.map(h => {
      const holidayDate = new Date(currentYear, h.month - 1, h.day, 9, 0, 0);
      return {
        ...h,
        date: holidayDate,
        isGlobalMaster: true
      };
    });

    await MarketingHoliday.insertMany(docs);
    logger.info(`✅ Seeded ${docs.length} master marketing holidays & campaign blueprints.`);
  } catch (err) {
    logger.warn('Notice seeding default holidays:', err.message);
  }
}

/**
 * Generates an automated Omnichannel Campaign Plan from a selected Holiday
 */
async function generateCampaignPlanFromHoliday(companyId, holidayId, userId, options = {}) {
  const holiday = await MarketingHoliday.findById(holidayId);
  if (!holiday) {
    throw new Error('Holiday not found');
  }

  const currentYear = new Date().getFullYear();
  const holidayDate = new Date(currentYear, holiday.month - 1, holiday.day);

  // Generate milestones based on blueprint
  const milestones = (holiday.campaignBlueprint || []).map(b => {
    const scheduledDate = new Date(holidayDate);
    scheduledDate.setDate(scheduledDate.getDate() + (b.phaseOffsetDays || 0));
    scheduledDate.setHours(10, 0, 0, 0); // 10:00 AM standard dispatch

    return {
      title: b.suggestedTitle || `${holiday.name} - ${b.actionType}`,
      channel: b.channel,
      actionType: b.actionType,
      scheduledDate,
      status: 'PLANNED',
      notes: b.suggestedCopyPrompt || null
    };
  });

  const startDate = milestones.length > 0 ? milestones[0].scheduledDate : new Date();
  const endDate = milestones.length > 0 ? milestones[milestones.length - 1].scheduledDate : holidayDate;

  const plan = await MarketingCampaignPlan.create({
    companyId,
    title: options.title || `${holiday.name} Omnichannel Campaign ${currentYear}`,
    objective: options.objective || 'FESTIVAL_SALES',
    holidayId: holiday._id,
    holidayName: holiday.name,
    targetAudienceDescription: options.targetAudienceDescription || `Registered customers and prospective leads for ${holiday.name}`,
    startDate,
    endDate,
    totalBudget: options.totalBudget || 15000,
    status: 'PLANNING',
    milestones,
    createdBy: userId
  });

  return plan;
}

module.exports = {
  DEFAULT_INDIAN_HOLIDAYS,
  seedDefaultHolidays,
  generateCampaignPlanFromHoliday
};
