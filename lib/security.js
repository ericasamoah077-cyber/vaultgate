import {
  scrypt, randomBytes, randomInt, timingSafeEqual, createHmac,
  createCipheriv, scryptSync,
} from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/* ---------- Salt + pepper password hashing ----------
   salt   : random per user, stored in the database next to the hash
   pepper : one secret from the PEPPER env var, never stored in the database
   flow   : HMAC-SHA256(pepper, password) -> scrypt(that, salt) -> hash          */
function pepper() {
  const p = process.env.PEPPER;
  if (!p || p.length < 16) throw new Error('PEPPER env var is missing or too short');
  return p;
}

async function derive(password, salt) {
  const peppered = createHmac('sha256', pepper()).update(password).digest();
  const key = await scryptAsync(peppered, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  return key.toString('hex');
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: await derive(password, salt) };
}

export async function verifyPassword(password, salt, hash) {
  const a = Buffer.from(await derive(password, salt), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Used to keep response time similar when an email does not exist.
export const FAKE = { salt: '00'.repeat(16), hash: '00'.repeat(64) };

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.';
  if (pw.length > 128) return 'Keep it under 128 characters.';
  if (!/[a-z]/i.test(pw) || !/\d/.test(pw)) return 'Include letters and at least one number.';
  return null;
}

/* ---------- Two-factor sign-in by email ----------
   A random 6-digit code is emailed after the password check. Only a peppered hash of it is
   stored, and it expires after 10 minutes.                                                    */
export const hashOtp = (code) => createHmac('sha256', pepper()).update(`otp:${code}`).digest('hex');

export function makeOtp() {
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  return { code, hash: hashOtp(code) };
}

export function otpMatches(code, storedHash) {
  const a = Buffer.from(hashOtp(code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------- Encrypt backups before they leave the server (AES-256-GCM) ---------- */
function backupKey() {
  const k = process.env.BACKUP_KEY || process.env.JWT_SECRET;
  if (!k) throw new Error('BACKUP_KEY env var is missing');
  return scryptSync(k, 'vaultgate-backup', 32);
}

export function encryptJSON(obj) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', backupKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]); // layout: iv(12) | tag(16) | data
}
