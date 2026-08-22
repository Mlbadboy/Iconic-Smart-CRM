const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from environment secret
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'charlie-crm-super-secret-master-key-32b';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM
 * @param {string} text Plaintext to encrypt
 * @returns {string} iv:authTag:encryptedHex
 */
function encrypt(text) {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted string
 * @param {string} encryptedString iv:authTag:encryptedHex
 * @returns {string} Plaintext
 */
function decrypt(encryptedString) {
  if (!encryptedString) return null;
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      // Fallback for unencrypted legacy or plain text in tests
      return encryptedString;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails, return null to avoid leaking corrupted data
    return null;
  }
}

/**
 * Masks sensitive tokens for safe display in UI
 * @param {string} str Secret string
 * @returns {string} Masked string (e.g. ••••••••a1b2)
 */
function maskSecret(str) {
  if (!str) return '••••••••';
  const clean = String(str).trim();
  if (clean.length <= 4) return '••••';
  return '••••••••' + clean.slice(-4);
}

module.exports = {
  encrypt,
  decrypt,
  maskSecret
};
