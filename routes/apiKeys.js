const express = require('express');
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const Company = require('../models/Company');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const { auth } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');
const { requireFeature } = require('../middleware/featureGate');
const logger = require('../services/logger');

const router = express.Router();
router.use(requireFeature('api_access'));

// Supported Features Dictionary (Backend auto-maps to internal capabilities)
const FEATURE_DEFINITIONS = {
  'SERIAL_VALIDATION': {
    code: 'SERIAL_VALIDATION',
    label: 'Serial Number Validation',
    permissions: ['serial_validation.validate', 'serial.verify'],
    endpointPath: '/api/v1/serial-validation/validate',
    sampleBody: {
      materialCode: 'MC12345',
      serialNumber: 'SN987654321',
      dealerCode: 'DLR001'
    }
  },
  'PRODUCT_VERIFY': {
    code: 'PRODUCT_VERIFY',
    label: 'Product / QR Verification',
    permissions: ['product.verify', 'serial_validation.validate'],
    endpointPath: '/api/v1/serial-validation/validate',
    sampleBody: {
      materialCode: 'MC12345',
      serialNumber: 'SN987654321',
      dealerCode: 'DLR001'
    }
  }
};

function normalizeFeatureKey(featureInput) {
  if (!featureInput) return 'SERIAL_VALIDATION';
  const str = String(featureInput).toUpperCase().trim();
  if (str.includes('PRODUCT') || str.includes('QR')) return 'PRODUCT_VERIFY';
  return 'SERIAL_VALIDATION';
}

function generateApiKey() {
  return 'ik_' + crypto.randomBytes(24).toString('hex');
}

function maskApiKey(keyStr) {
  if (!keyStr) return 'ik_••••••••••••';
  if (keyStr.length <= 7) return keyStr;
  return keyStr.substring(0, 3) + '••••••••••••' + keyStr.slice(-4);
}

function formatIntegrationSnippet(host, key, featureDef) {
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  const baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
  const fullEndpoint = `${baseUrl}${featureDef.endpointPath}`;
  const legacyEndpoint = `${baseUrl}/qerp/validatesno.asp`;
  
  return {
    endpoint: fullEndpoint,
    legacyEndpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-API-Key': key
    },
    sampleBody: {
      materialCode: 'UTIXK',
      serialNumber: 'IXHFJDGHH',
      dealerCode: '55262'
    },
    sampleBodyWithKey: {
      materialCode: 'UTIXK',
      serialNumber: 'IXHFJDGHH',
      dealerCode: '55262',
      accessKey: key
    },
    responseCodes: {
      '0': 'Valid Serial Number',
      '-1': 'Invalid Serial Number',
      '-2': 'Mismatch in model and serial number',
      '-3': 'Serial Number Already Validated',
      '-4': 'Invalid Material code',
      '-5': 'Serial Number not billed to this dealer'
    },
    curlSnippet: `curl -X POST "${fullEndpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${key}" \\\n  -d '{\n    "materialCode": "UTIXK",\n    "serialNumber": "IXHFJDGHH",\n    "dealerCode": "55262"\n  }'`,
    powershellSnippet: `$body = @{\n    materialCode = "UTIXK"\n    serialNumber = "IXHFJDGHH"\n    dealerCode   = "55262"\n} | ConvertTo-Json\n\nInvoke-RestMethod -Uri "${fullEndpoint}" -Method POST -Headers @{ "X-API-Key" = "${key}" } -ContentType "application/json" -Body $body`
  };
}

const isSuperAdminUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super-admin' || role === 'superadmin';
};

// Helper: build date query
function getDateFilterQuery(period, startDate, endDate) {
  const now = new Date();
  const dateQuery = {};

  if (period === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateQuery.$gte = startOfToday;
  } else if (period === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateQuery.$gte = sevenDaysAgo;
  } else if (period === '30d') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateQuery.$gte = thirtyDaysAgo;
  } else if (period === 'custom') {
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
  }

  return Object.keys(dateQuery).length > 0 ? dateQuery : null;
}

// 1. Super Admin Platform API Overview (Aggregate reporting only - zero secret exposure)
router.get('/platform-overview', auth, async (req, res) => {
  try {
    if (!isSuperAdminUser(req.user)) {
      return res.status(403).json({ error: 'Super Administrator access required' });
    }

    const companies = await Company.find({}).select('name code subdomain status').lean();
    const overview = await Promise.all(companies.map(async (comp) => {
      const totalApis = await ApiKey.countDocuments({ companyId: comp._id });
      const activeApis = await ApiKey.countDocuments({ companyId: comp._id, status: 'ACTIVE' });
      const revokedApis = await ApiKey.countDocuments({ companyId: comp._id, status: 'REVOKED' });
      
      const totalRequests = await SerialValidationHistory.countDocuments({ companyId: comp._id });
      const uniqueSerialsList = await SerialValidationHistory.distinct('serialNumber', { companyId: comp._id });
      const successfulValidations = await SerialValidationHistory.countDocuments({ companyId: comp._id, validationResult: 'VALID' });
      const failedValidations = totalRequests - successfulValidations;

      const latestKey = await ApiKey.findOne({ companyId: comp._id }).sort({ lastUsedAt: -1 }).select('lastUsedAt').lean();
      const latestLog = await SerialValidationHistory.findOne({ companyId: comp._id }).sort({ createdAt: -1 }).select('createdAt').lean();

      return {
        companyId: comp._id,
        companyName: comp.name,
        companyCode: comp.code,
        subdomain: comp.subdomain,
        totalApis,
        activeApis,
        revokedApis,
        totalRequests,
        uniqueSerials: uniqueSerialsList.length,
        successfulValidations,
        failedValidations,
        lastActivity: latestLog?.createdAt || latestKey?.lastUsedAt || null
      };
    }));

    res.json(overview);
  } catch (err) {
    logger.error('Error fetching platform API overview:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Create API Key (Generate -> Copy -> Done)
router.post('/', auth, async (req, res) => {
  try {
    const { name, feature, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'API Name is required' });
    }

    // Strictly resolve companyId from authenticated user or explicit Super Admin context
    let targetCompanyId = req.user.companyId;
    if (isSuperAdminUser(req.user) && req.body.companyId) {
      targetCompanyId = req.body.companyId;
    }

    if (!targetCompanyId) {
      return res.status(400).json({ error: 'Active company context required to create an API key' });
    }

    // Auto-map feature to internal capability
    const featureKey = normalizeFeatureKey(feature);
    const featureDef = FEATURE_DEFINITIONS[featureKey];

    const rawKey = generateApiKey();

    const apiKey = new ApiKey({
      key: rawKey,
      name: name.trim(),
      feature: featureDef.label,
      clientName: name.trim(),
      description: description?.trim() || null,
      partnerType: 'INTEGRATOR',
      companyId: targetCompanyId,
      userId: req.user.id,
      status: 'ACTIVE',
      active: true,
      permissions: featureDef.permissions,
      scope: ['ALL']
    });

    await apiKey.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'api_key.create',
      entity: 'ApiKey',
      entityId: apiKey._id,
      newValue: { name: apiKey.name, feature: apiKey.feature, companyId: targetCompanyId }
    });

    // Prepare one-time complete integration package
    const host = req.headers.host || 'api.charliescrm.com';
    const integration = formatIntegrationSnippet(host, rawKey, featureDef);

    res.status(201).json({
      message: 'API Key generated successfully',
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        feature: apiKey.feature,
        status: apiKey.status,
        key: rawKey, // Shown only once
        createdAt: apiKey.createdAt
      },
      integration,
      warning: 'Save this API key now. For security, the complete key will not be shown again.'
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(400).json({ error: error.message });
  }
});

// 3. Get Company API Keys with Usage Summaries (Always returns masked keys)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (isSuperAdminUser(req.user)) {
      if (req.query.companyId) query.companyId = req.query.companyId;
    } else {
      if (!req.user.companyId) return res.json([]);
      query.companyId = req.user.companyId;
    }

    const apiKeys = await ApiKey.find(query).sort({ createdAt: -1 }).lean();
    const host = req.headers.host || 'api.charliescrm.com';

    const listWithStats = await Promise.all(apiKeys.map(async (k) => {
      const featureKey = normalizeFeatureKey(k.feature);
      const featureDef = FEATURE_DEFINITIONS[featureKey];
      const maskedKeyStr = maskApiKey(k.key);

      const totalRequests = await SerialValidationHistory.countDocuments({ apiKeyId: k._id });
      const uniqueSerials = await SerialValidationHistory.distinct('serialNumber', { apiKeyId: k._id });
      const successful = await SerialValidationHistory.countDocuments({ apiKeyId: k._id, validationResult: 'VALID' });
      const failed = totalRequests - successful;

      return {
        id: k._id,
        name: k.name,
        feature: k.feature || featureDef.label,
        maskedKey: maskedKeyStr,
        status: k.status || (k.active ? 'ACTIVE' : 'REVOKED'),
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt || k.usage?.lastUsed || null,
        totalRequests,
        uniqueSerials: uniqueSerials.length,
        successful,
        failed,
        integrationSnippet: formatIntegrationSnippet(host, maskedKeyStr, featureDef)
      };
    }));

    res.json(listWithStats);
  } catch (error) {
    logger.error('Error listing API keys:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. API Key Usage Analytics & Breakdown Endpoint
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    let keyQuery = { _id: req.params.id };
    if (!isSuperAdminUser(req.user)) {
      keyQuery.companyId = req.user.companyId;
    }

    const apiKey = await ApiKey.findOne(keyQuery).lean();
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found or permission denied' });
    }

    const { period, startDate, endDate } = req.query;
    const historyQuery = { apiKeyId: apiKey._id };

    const dateFilter = getDateFilterQuery(period, startDate, endDate);
    if (dateFilter) {
      historyQuery.createdAt = dateFilter;
    }

    const totalRequests = await SerialValidationHistory.countDocuments(historyQuery);
    const uniqueSerialsList = await SerialValidationHistory.distinct('serialNumber', historyQuery);
    const successfulValidations = await SerialValidationHistory.countDocuments({ ...historyQuery, validationResult: 'VALID' });
    const failedValidations = totalRequests - successfulValidations;
    const successRate = totalRequests > 0 ? Number(((successfulValidations / totalRequests) * 100).toFixed(1)) : 0;

    // Outcome Breakdown
    const ALL_OUTCOMES = [
      'VALID',
      'INVALID_SERIAL',
      'MODEL_SERIAL_MISMATCH',
      'ALREADY_VALIDATED',
      'INVALID_MATERIAL_CODE',
      'DEALER_MISMATCH',
      'UNAUTHORIZED',
      'RATE_LIMITED',
      'SERVICE_ERROR'
    ];

    const outcomeCounts = {};
    for (const outcome of ALL_OUTCOMES) {
      outcomeCounts[outcome] = await SerialValidationHistory.countDocuments({
        ...historyQuery,
        validationResult: outcome
      });
    }

    // Recent 50 Logs (Masked serials)
    const logs = await SerialValidationHistory.find(historyQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('materialCode serialNumber maskedSerial dealerCode validationResult responseStatus latency createdAt requestId')
      .lean();

    const formattedLogs = logs.map(l => ({
      id: l._id,
      requestId: l.requestId || 'N/A',
      materialCode: l.materialCode,
      maskedSerial: l.maskedSerial || (l.serialNumber ? (l.serialNumber.substring(0, 2) + '••••' + l.serialNumber.slice(-4)) : 'N/A'),
      dealerCode: l.dealerCode,
      result: l.validationResult,
      responseStatus: l.responseStatus,
      latencyMs: l.latency || 0,
      timestamp: l.createdAt
    }));

    // Requests over time (group by day)
    const timeSeries = await SerialValidationHistory.aggregate([
      { $match: historyQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$validationResult', 'VALID'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $ne: ['$validationResult', 'VALID'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        feature: apiKey.feature,
        status: apiKey.status,
        maskedKey: maskApiKey(apiKey.key),
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt
      },
      period: period || 'all',
      metrics: {
        totalRequests,
        uniqueSerials: uniqueSerialsList.length,
        successfulValidations,
        failedValidations,
        successRate
      },
      outcomeBreakdown: outcomeCounts,
      requestsOverTime: timeSeries.map(t => ({ date: t._id, total: t.total, successful: t.successful, failed: t.failed })),
      recentLogs: formattedLogs
    });

  } catch (err) {
    logger.error('Error fetching API key analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Revoke API Key
router.patch('/:id/revoke', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (!isSuperAdminUser(req.user)) {
      query.companyId = req.user.companyId;
    }

    const apiKey = await ApiKey.findOne(query);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found or permission denied' });
    }

    apiKey.status = 'REVOKED';
    apiKey.active = false;
    apiKey.revokedAt = new Date();
    await apiKey.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'api_key.revoke',
      entity: 'ApiKey',
      entityId: apiKey._id,
      newValue: { status: 'REVOKED' }
    });

    res.json({ message: 'API key revoked successfully', apiKey: { id: apiKey._id, status: apiKey.status } });
  } catch (error) {
    logger.error('Error revoking API key:', error);
    res.status(500).json({ error: error.message });
  }
});

// Backward-compatible DELETE route
router.delete('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (!isSuperAdminUser(req.user)) {
      query.companyId = req.user.companyId;
    }

    const apiKey = await ApiKey.findOne(query);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found or permission denied' });
    }

    apiKey.status = 'REVOKED';
    apiKey.active = false;
    apiKey.revokedAt = new Date();
    await apiKey.save();

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
