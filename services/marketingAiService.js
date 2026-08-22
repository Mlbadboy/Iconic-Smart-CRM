const logger = require('./logger');

/**
 * Intelligent AI copy generation engine for Marketing & Social Media
 */
function generateMarketingCopy(promptData) {
  const {
    topic,
    productName = 'Smart Appliance',
    tone = 'FESTIVE', // FESTIVE, PROMOTIONAL, PREMIUM, ENGAGING, PROFESSIONAL, URGENT
    channel = 'INSTAGRAM', // INSTAGRAM, FACEBOOK, WHATSAPP, REEL, META_ADS
    targetAudience = 'Homeowners and Families',
    offerDetails = 'Special Festive Discount + 10-Year Warranty',
    holiday = null
  } = promptData;

  const hashtagsBase = [
    '#SmartLiving',
    '#HomeAppliances',
    '#PureWater',
    '#WaterHeater',
    '#SmartHome',
    '#FestiveSale',
    '#CharlieLiving',
    '#HealthyHome',
    '#MadeInIndia',
    '#UpgradeYourLife'
  ];

  let caption = '';
  let headlines = [];
  let suggestedHashtags = [...hashtagsBase];

  if (holiday) {
    suggestedHashtags.unshift(`#${holiday.replace(/\s+/g, '')}`, `#${holiday.replace(/\s+/g, '')}Deals`);
  }

  // Tone-crafted copy variations
  switch (tone) {
    case 'FESTIVE':
      caption = `✨ Celebrate the spirit of ${holiday || 'this festive season'} with pure joy and comfort! 🪔\n\nUpgrade your home with the all-new ${productName}. Experience advanced purification and instant heating technology engineered for modern Indian families.\n\n🎁 Festive Special: ${offerDetails}\n\n👉 Tap the link in bio to book your complimentary home demo and claim your festive gift voucher today! ✨\n\n`;
      headlines = [
        `✨ Celebrate with Pure Health & Comfort this ${holiday || 'Festive Season'}!`,
        `🪔 Shubh Festive Dhamaka: Get ${offerDetails} on ${productName}`,
        `Sparkle this Season with Premium Smart Living Upgrades 🎁`
      ];
      break;

    case 'PROMOTIONAL':
      caption = `🔥 MEGA PRICE DROP ALERT! 🔥\n\nUpgrade your kitchen & bathroom with ${productName} at unbeatable seasonal prices. Packed with intelligent sensors, energy-efficient operation, and unmatched durability.\n\n⚡ Offer: ${offerDetails}\n🚚 Free Installation & Zero-Cost EMI Available!\n\n🛒 Order now or visit your nearest authorized dealer! Limited stock remaining.`;
      headlines = [
        `🔥 Exclusive Flash Deal: ${offerDetails} on ${productName}`,
        `Upgrade to Smart Living with 0% EMI & Free Home Installation`,
        `Unbeatable Seasonal Savings on ${productName} - Limited Stock!`
      ];
      break;

    case 'PREMIUM':
      caption = `Elegance meets state-of-the-art engineering. 💎\n\nIntroducing the sleek, sophisticated ${productName} designed to elevate your modern home aesthetic while delivering uncompromising performance.\n\n🛡️ Backed by our Industry-Leading 10-Year Warranty.\n\nDiscover the art of smart living at charlieai.in`;
      headlines = [
        `Crafted for Elegance. Engineered for Purity.`,
        `The Luxury of Pure Water & Instant Comfort: ${productName}`,
        `Redefine Your Living Space with Charlie's Signature Range`
      ];
      break;

    case 'URGENT':
      caption = `⏰ FINAL CALL: Offers Expire in 24 Hours! ⏰\n\nDon't miss out on the season's biggest discounts on ${productName}.\n\n💥 Exclusive Bonus: ${offerDetails}\n\n👉 Click the link right now to lock in your discount before prices go up tomorrow!`;
      headlines = [
        `⏰ Last 24 Hours: Grab ${offerDetails} Before It's Gone!`,
        `Hurry! Final Day of Festive Flash Sale on ${productName}`,
        `Prices Increase Tomorrow - Claim Your Voucher Now!`
      ];
      break;

    default: // ENGAGING / PROFESSIONAL
      caption = `Did you know that 80% of water quality issues can be eliminated with intelligent multi-stage filtration? 💧\n\nMeet the ${productName} — engineered to protect your loved ones with crystal-clear purity and whisper-quiet operation.\n\n💡 Key Highlight: ${offerDetails}\n\nDrop a comment below or DM us "PURE" to get an instant brochure & expert consultation! 👇`;
      headlines = [
        `Pure Health Starts with Pure Water: Discover ${productName}`,
        `Smart Living Made Simple for Every Indian Household`,
        `Experience the Future of Smart Home Appliances with Charlie`
      ];
      break;
  }

  // Channel-specific adjustments
  if (channel === 'WHATSAPP') {
    caption = `👋 *Hello {{name}}!* \n\n✨ *Special Festive Announcement from Charlie Appliances* ✨\n\nWe are excited to bring you an exclusive offer on our premium *${productName}*.\n\n🎁 *Your VIP Offer:* ${offerDetails}\n\n✅ 10-Year Warranty Included\n✅ Free Delivery & Express Installation\n✅ 0% Interest EMI Available\n\nReply *YES* to claim your exclusive discount code or tap below to speak with our product expert!`;
  } else if (channel === 'REEL') {
    caption = `${caption}\n\n🎥 Save this reel for your next home upgrade! 📌`;
  }

  return {
    success: true,
    caption: `${caption}\n\n${suggestedHashtags.slice(0, 8).join(' ')}`,
    rawCaption: caption,
    headlines,
    suggestedHashtags,
    tone,
    channel,
    wordCount: caption.split(/\s+/).length
  };
}

/**
 * Generates omnichannel multi-format variations (Instagram, Facebook, WhatsApp, Meta Ad)
 */
function generateMultiChannelVariations(baseTopic, productName, offerDetails, holiday) {
  const ig = generateMarketingCopy({ topic: baseTopic, productName, tone: 'FESTIVE', channel: 'INSTAGRAM', offerDetails, holiday });
  const fb = generateMarketingCopy({ topic: baseTopic, productName, tone: 'PROMOTIONAL', channel: 'FACEBOOK', offerDetails, holiday });
  const wa = generateMarketingCopy({ topic: baseTopic, productName, tone: 'FESTIVE', channel: 'WHATSAPP', offerDetails, holiday });
  const ad = generateMarketingCopy({ topic: baseTopic, productName, tone: 'URGENT', channel: 'META_ADS', offerDetails, holiday });
  const reel = generateMarketingCopy({ topic: baseTopic, productName, tone: 'ENGAGING', channel: 'REEL', offerDetails, holiday });

  return {
    instagramPost: ig,
    facebookPost: fb,
    whatsAppBroadcast: wa,
    metaAdCopy: ad,
    instagramReel: reel
  };
}

module.exports = {
  generateMarketingCopy,
  generateMultiChannelVariations
};
