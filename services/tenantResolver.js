const Company = require('../models/Company');
const logger = require('./logger');

// Reserved subdomains that cannot be claimed by any tenant
const RESERVED_SUBDOMAINS = new Set([
  'app',
  'admin',
  'api',
  'www',
  'mail',
  'support',
  'localhost',
  'test',
  'platform',
  'system',
  'root',
  'superadmin',
  'dashboard',
  'status',
  'auth',
  'cdn',
  'assets',
  'help'
]);

// In-memory cache for fast tenant resolution: subdomain -> { company, cachedAt }
const companyCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

/**
 * Checks if a subdomain is reserved
 */
function isReservedSubdomain(subdomain) {
  if (!subdomain) return true;
  return RESERVED_SUBDOMAINS.has(String(subdomain).toLowerCase().trim());
}

/**
 * Validates format and availability of subdomain
 */
function validateSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') {
    return { valid: false, reason: 'Subdomain is required' };
  }
  const clean = subdomain.toLowerCase().trim();
  if (clean.length < 2 || clean.length > 63) {
    return { valid: false, reason: 'Subdomain must be between 2 and 63 characters' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(clean)) {
    return { valid: false, reason: 'Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen)' };
  }
  if (isReservedSubdomain(clean)) {
    return { valid: false, reason: `'${clean}' is a reserved system subdomain and cannot be assigned` };
  }
  return { valid: true, clean };
}

/**
 * Extract hostname safely respecting the Trusted Proxy configuration rule
 */
function extractHost(req) {
  const isTrustProxy = process.env.TRUST_PROXY === 'true' || req.app?.get?.('trust proxy');
  
  let hostHeader = '';
  if (isTrustProxy && req.headers['x-forwarded-host']) {
    // Only trust X-Forwarded-Host if proxy is explicitly trusted
    hostHeader = req.headers['x-forwarded-host'].split(',')[0].trim();
  } else {
    hostHeader = req.headers.host || req.hostname || 'localhost';
  }

  // Remove port if present (e.g. "abc.localhost:7000" -> "abc.localhost")
  return hostHeader.split(':')[0].toLowerCase().trim();
}

/**
 * Extract subdomain from host
 * Examples:
 * - "abc.charliescrm.com" -> "abc"
 * - "abc.localhost" -> "abc"
 * - "app.charliescrm.com" -> "app" (Platform Console)
 * - "charliescrm.com" -> null (Naked domain)
 * - "localhost" -> null
 */
function extractSubdomain(host) {
  if (!host) return null;
  const parts = host.split('.');

  // Localhost format: e.g. ["abc", "localhost"]
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0].toLowerCase();
  }

  // Custom multi-level: e.g. ["abc", "charliescrm", "com"]
  if (parts.length >= 3) {
    return parts[0].toLowerCase();
  }

  return null;
}

/**
 * Invalidate in-memory cache for a company
 */
function invalidateTenantCache(identifier) {
  if (!identifier) {
    companyCache.clear();
    return;
  }
  for (const [key, entry] of companyCache.entries()) {
    if (key === String(identifier).toLowerCase() || String(entry.company?._id) === String(identifier) || entry.company?.code === identifier) {
      companyCache.delete(key);
    }
  }
}

/**
 * Resolves Company entity from incoming request based on Host / Subdomain
 */
async function resolveTenantFromHost(req) {
  const host = extractHost(req);
  const subdomain = extractSubdomain(host);

  // If no subdomain or "app" / "platform" -> Super Admin platform context
  if (!subdomain || subdomain === 'app' || subdomain === 'platform' || subdomain === 'admin') {
    return {
      isPlatform: true,
      subdomain: subdomain || null,
      host,
      company: null
    };
  }

  // Check in-memory cache
  const cached = companyCache.get(subdomain);
  if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
    return {
      isPlatform: false,
      subdomain,
      host,
      company: cached.company
    };
  }

  // Query Database
  const company = await Company.findOne({ subdomain }).lean();
  if (company) {
    companyCache.set(subdomain, { company, cachedAt: Date.now() });
  }

  return {
    isPlatform: false,
    subdomain,
    host,
    company: company || null
  };
}

module.exports = {
  RESERVED_SUBDOMAINS,
  isReservedSubdomain,
  validateSubdomain,
  extractHost,
  extractSubdomain,
  resolveTenantFromHost,
  invalidateTenantCache
};
