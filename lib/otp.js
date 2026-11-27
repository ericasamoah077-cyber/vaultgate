import { sql } from './db';
import { makeOtp, hashOtp } from './security';
import { sendOtpEmail, sendResetEmail } from './mail';

const secondsLeft = (sentAt) => 30 - Math.floor((Date.now() - new Date(sentAt).getTime()) / 1000);

// Sign-in / registration code: stored hashed for 10 minutes, then emailed.
// With enforceCooldown, refuses to send again within 30 seconds.
export async function issueOtp(u, { enforceCooldown = false, purpose = 'signin' } = {}) {
  if (enforceCooldown && u.otp_sent_at && secondsLeft(u.otp_sent_at) > 0) return { wait: secondsLeft(u.otp_sent_at) };
  const { code, hash } = makeOtp();
  await sql`UPDATE users SET otp_hash = ${hash}, otp_expires = now() + interval '10 minutes',
            otp_attempts = 0, otp_sent_at = now() WHERE id = ${u.id}`;
  await sendOtpEmail(u.email, u.name, code, purpose);
  return {};
}

// Password reset code: separate from the sign-in code, same rules.
export const resetHash = (code) => hashOtp(`reset:${code}`);

export async function issueReset(u, { enforceCooldown = false } = {}) {
  if (enforceCooldown && u.reset_sent_at && secondsLeft(u.reset_sent_at) > 0) return { wait: secondsLeft(u.reset_sent_at) };
  const { code } = makeOtp();
  await sql`UPDATE users SET reset_hash = ${resetHash(code)}, reset_expires = now() + interval '10 minutes',
            reset_attempts = 0, reset_sent_at = now() WHERE id = ${u.id}`;
  await sendResetEmail(u.email, u.name, code);
  return {};
}

export function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}
