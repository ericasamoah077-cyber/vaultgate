import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sql, ensureReady } from '@/lib/db';
import { sameOrigin } from '@/lib/session';
import { hashPassword, passwordProblem } from '@/lib/security';
import { resetHash } from '@/lib/otp';
import { sendPasswordChangedEmail } from '@/lib/mail';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const BAD = 'That code isn’t valid or has expired. Check your email, or request a new code.';

export async function POST(req) {
  if (!sameOrigin(req)) return fail('Blocked request.', 403);
  await ensureReady();
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  const code = String(b.code || '').replace(/\s/g, '');
  const password = String(b.password || '');

  if (!/^\d{6}$/.test(code)) return fail('Enter the 6-digit code from your email.');
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const [u] = await sql`SELECT * FROM users WHERE email = ${email} AND status = 'active'`;
  if (!u || !u.reset_hash || !u.reset_expires || new Date(u.reset_expires) < new Date() || u.reset_attempts >= 5) {
    return fail(BAD);
  }
  const a = Buffer.from(resetHash(code), 'hex');
  const h = Buffer.from(u.reset_hash, 'hex');
  if (a.length !== h.length || !timingSafeEqual(a, h)) {
    await sql`UPDATE users SET reset_attempts = reset_attempts + 1 WHERE id = ${u.id}`;
    return fail(BAD);
  }

  const { salt, hash } = await hashPassword(password);
  await sql`UPDATE users SET salt = ${salt}, password_hash = ${hash}, must_change_password = false,
            pw_changed_at = now(), reset_hash = NULL, reset_expires = NULL, reset_attempts = 0,
            otp_hash = NULL, failed_attempts = 0, locked_until = NULL WHERE id = ${u.id}`;
  await audit(u, 'password_reset', email);
  sendPasswordChangedEmail(u.email, u.name).catch((e) => console.error('notice email failed', e));
  return NextResponse.json({ ok: true });
}
