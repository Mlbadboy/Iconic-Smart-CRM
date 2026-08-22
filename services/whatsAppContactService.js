const WhatsAppContact = require('../models/WhatsAppContact');
const logger = require('./logger');

/**
 * Normalizes a phone number to standard E.164 (+91XXXXXXXXXX)
 * @param {string|number} rawPhone 
 * @returns {{ valid: boolean, normalized: string|null, error: string|null }}
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) {
    return { valid: false, normalized: null, error: 'Phone number is empty' };
  }

  let cleaned = String(rawPhone).trim().replace(/[^\d+]/g, '');

  // Remove leading + for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove leading 0 (e.g. 09876543210)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Indian standard mobile handling (10 digits starting with 6, 7, 8, 9)
  if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, normalized: `+91${cleaned}`, error: null };
  }

  // If 12 digits starting with 91
  if (cleaned.length === 12 && cleaned.startsWith('91') && /^91[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}`, error: null };
  }

  // General E.164 international validation (between 10 and 15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15 && /^\d+$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}`, error: null };
  }

  return {
    valid: false,
    normalized: null,
    error: `Invalid phone format: "${rawPhone}" (must be 10-15 valid digits)`
  };
}

/**
 * Validates email format
 */
function isValidEmail(email) {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

/**
 * Parses raw CSV string into array of objects (zero-dependency)
 */
function parseCsvString(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header line
  const rawHeaders = splitCsvLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCsvLine(lines[i]);
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawCols[idx] !== undefined ? rawCols[idx].trim() : '';
    });
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Splits a single CSV line respecting quotes
 */
function splitCsvLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parses and safely imports contacts from CSV buffer/string
 */
async function importContactsFromCSV(companyId, csvBufferOrString, options = {}) {
  const {
    source = 'CSV_IMPORT',
    defaultOptIn = true,
    sessionId = `import_${Date.now()}`
  } = options;

  const content = Buffer.isBuffer(csvBufferOrString) ? csvBufferOrString.toString('utf8') : String(csvBufferOrString);
  const rows = parseCsvString(content);

  const stats = {
    total: rows.length,
    valid: 0,
    invalid: 0,
    duplicate: 0,
    existing: 0,
    imported: 0,
    failed: 0,
    errors: []
  };

  const seenInBatch = new Set();
  const validContactsToInsert = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2; // Accounting for 1-indexed header

    // Extract core fields with flexible column headers
    const rawName = row.name || row.fullname || row.customername || row.contactname || 'Valued Customer';
    const rawPhone = row.mobile || row.phone || row.mobilenumber || row.phonenumber || row.whatsapp || row.contactno;
    const rawEmail = row.email || row.emailaddress || null;
    const city = row.city || null;
    const state = row.state || null;
    const dealerCode = row.dealercode || row.dealer_code || null;
    const product = row.product || row.model || row.item || null;
    const customerType = (row.customertype || row.type || 'CUSTOMER').toUpperCase();

    // 1. Phone validation
    const phoneResult = normalizePhone(rawPhone);
    if (!phoneResult.valid) {
      stats.invalid++;
      stats.errors.push({
        row: rowNumber,
        phone: rawPhone || '',
        error: phoneResult.error
      });
      continue;
    }

    const normalizedPhone = phoneResult.normalized;

    // 2. Email validation
    if (rawEmail && !isValidEmail(rawEmail)) {
      stats.invalid++;
      stats.errors.push({
        row: rowNumber,
        phone: normalizedPhone,
        error: `Invalid email address: "${rawEmail}"`
      });
      continue;
    }

    // 3. In-batch duplicate check
    if (seenInBatch.has(normalizedPhone)) {
      stats.duplicate++;
      stats.errors.push({
        row: rowNumber,
        phone: normalizedPhone,
        error: 'Duplicate phone number inside CSV file'
      });
      continue;
    }
    seenInBatch.add(normalizedPhone);

    // Extract additional custom fields
    const coreKeys = ['name', 'fullname', 'customername', 'contactname', 'mobile', 'phone', 'mobilenumber', 'phonenumber', 'whatsapp', 'contactno', 'email', 'emailaddress', 'city', 'state', 'dealercode', 'dealer_code', 'product', 'model', 'item', 'customertype', 'type'];
    const customFields = {};
    for (const [k, v] of Object.entries(row)) {
      if (!coreKeys.includes(k) && v) {
        customFields[k] = String(v).trim();
      }
    }

    stats.valid++;

    validContactsToInsert.push({
      companyId,
      name: String(rawName).trim(),
      mobile: String(rawPhone).trim(),
      normalizedPhone,
      email: rawEmail ? String(rawEmail).trim().toLowerCase() : null,
      city: city ? String(city).trim() : null,
      state: state ? String(state).trim() : null,
      dealerCode: dealerCode ? String(dealerCode).trim() : null,
      product: product ? String(product).trim() : null,
      customerType: ['CUSTOMER', 'DEALER', 'DISTRIBUTOR', 'RETAILER', 'PROSPECT'].includes(customerType) ? customerType : 'CUSTOMER',
      customFields,
      whatsappOptIn: defaultOptIn,
      whatsappOptInAt: new Date(),
      whatsappOptInSource: source,
      whatsappOptOut: false,
      status: 'VALID',
      importSessionId: sessionId
    });
  }

  // 4. Batch upsert into database
  for (const item of validContactsToInsert) {
    try {
      const existing = await WhatsAppContact.findOne({
        companyId,
        normalizedPhone: item.normalizedPhone
      });

      if (existing) {
        // Update existing record with fresh fields while preserving opt-out status
        stats.existing++;
        existing.name = item.name || existing.name;
        existing.email = item.email || existing.email;
        existing.city = item.city || existing.city;
        existing.state = item.state || existing.state;
        existing.dealerCode = item.dealerCode || existing.dealerCode;
        existing.product = item.product || existing.product;
        existing.customerType = item.customerType || existing.customerType;
        existing.customFields = new Map([...(existing.customFields || new Map()), ...Object.entries(item.customFields)]);
        existing.importSessionId = sessionId;
        await existing.save();
      } else {
        await WhatsAppContact.create(item);
        stats.imported++;
      }
    } catch (err) {
      stats.failed++;
      stats.errors.push({
        phone: item.normalizedPhone,
        error: err.message
      });
    }
  }

  return {
    sessionId,
    stats,
    sampleValidContacts: validContactsToInsert.slice(0, 5)
  };
}

module.exports = {
  normalizePhone,
  isValidEmail,
  parseCsvString,
  importContactsFromCSV
};
