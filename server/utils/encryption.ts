// ─────────────────────────────────────────────────────────────
// AES-256-GCM Encryption Utility
//
// Encrypts/decrypts secrets (SMTP passwords, eBay keys,
// Telegram tokens) stored in the `settings` table.
//
// Format: "enc:<base64(iv:authTag:ciphertext)>"
//
// Key derivation: PBKDF2 (100,000 iterations, SHA-256)
// produces a deterministic 32-byte key from any passphrase.
// The static salt prevents rainbow tables; the high iteration
// count prevents GPU brute-force attacks.
//
// See ARCHITECTURE.md §8 (Security Model).
// ─────────────────────────────────────────────────────────────

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from 'node:crypto';
import { createLogger } from './logger';

const log = createLogger('encryption');

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENC_PREFIX = 'enc:';
const KDF_SALT = 'ebay-tracker-kdf-salt-v1';
const KDF_ITERATIONS = 100_000;
const KEY_LENGTH = 32;

// ─────────────────────────────────────────────────────────────
// Key Derivation
// ─────────────────────────────────────────────────────────────

/**
 * Derives a 32-byte encryption key from the ENCRYPTION_KEY env var.
 *
 * Uses PBKDF2 with 100,000 iterations and a static application-
 * specific salt. The result is cached in module scope (singleton —
 * derived once per process).
 *
 * @throws {Error} if ENCRYPTION_KEY is not set.
 */
function deriveKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey || envKey.trim().length === 0) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'All secrets require this key for AES-256-GCM encryption. ' +
        'Set it in .env or your Docker environment.',
    );
  }

  // Secure PBKDF2 derivation instead of plain SHA-256
  return pbkdf2Sync(envKey, KDF_SALT, KDF_ITERATIONS, KEY_LENGTH, 'sha256');
}

/** Lazily cached derived key */
let _derivedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!_derivedKey) {
    _derivedKey = deriveKey();
  }
  return _derivedKey;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Returns a prefixed string: `enc:<base64(iv + authTag + ciphertext)>`
 *
 * The IV is generated randomly for each call, ensuring that
 * encrypting the same plaintext twice produces different output.
 *
 * @param plaintext — The secret value to encrypt.
 * @returns Encrypted string with `enc:` prefix.
 * @throws {Error} if ENCRYPTION_KEY is not configured.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: iv (12) + authTag (16) + ciphertext (variable)
  const packed = Buffer.concat([iv, authTag, encrypted]);

  return ENC_PREFIX + packed.toString('base64');
}

/**
 * Decrypts an `enc:`-prefixed string back to plaintext.
 *
 * @param encryptedValue — The encrypted string (must start with `enc:`).
 * @returns The original plaintext.
 * @throws {Error} if the value is not properly formatted or decryption fails.
 */
export function decrypt(encryptedValue: string): string {
  if (!isEncrypted(encryptedValue)) {
    throw new Error(
      `Value is not encrypted (missing "${ENC_PREFIX}" prefix). ` +
        'Ensure the value was encrypted with encrypt() before calling decrypt().',
    );
  }

  const key = getKey();
  const packed = Buffer.from(encryptedValue.slice(ENC_PREFIX.length), 'base64');

  // Validate minimum length: IV (12) + AuthTag (16) = 28 bytes minimum
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted value is too short — data may be corrupted.');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    log.error('Decryption failed — wrong key or corrupted data');
    throw new Error(
      'Decryption failed. This usually means the ENCRYPTION_KEY has changed ' +
        'since the value was encrypted, or the data is corrupted.',
    );
  }
}

/**
 * Checks whether a value is encrypted (starts with `enc:` prefix).
 *
 * Use this to determine whether a settings value needs decryption
 * before use.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

/**
 * Masks a secret value for safe display in API responses.
 *
 * Returns a fixed `"••••••••"` string. No characters of the
 * real secret are ever exposed to the SPA.
 *
 * @param _encryptedValue — The `enc:`-prefixed encrypted value (unused).
 * @returns Masked string safe for frontend display.
 */
export function maskSecret(_encryptedValue: string): string {
  // Do not expose the last 4 characters to the SPA under any circumstance
  return '••••••••';
}

/**
 * Resets the cached derived key.
 *
 * Call this if the ENCRYPTION_KEY env var changes at runtime
 * (unlikely in production, useful in tests).
 */
export function resetEncryptionKey(): void {
  _derivedKey = null;
}
