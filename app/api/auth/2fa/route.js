import { NextResponse } from 'next/server';
import { sql, ensureReady } from '@/lib/db';
import { getPendingUserId, setSession, sameOrigin } from '@/lib/session';
import { otpMatches } from '@/lib/security';
import { registerFailure, isLocked, lockMessage } from '@/lib/lockout';
import { ROLE_HOME } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error, status) => NextResponse.json({ error }, { status });

// Check the 6-digit code that was emailed and finish the sign-in.
export async function POST(req) {
  if (!sameOrigin(req)) return fail('Blocked request.', 403);
  await ensureReady();
  const id = await getPendingUserId();
  const [u] = id ? await sql`SELECT * FROM users WHERE id = ${id} AND status = 'active'` : [];
  if (!u) return fail('Your sign-in expired. Start again.', 401);
  if (isLocked(u)) return fail(lockMessage(u), 423);

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return fail('Enter the 6-digit code from your email.', 400);
  if (!u.otp_hash || !u.otp_expires || new Date(u.otp_expires) < new Date()) {
    return fail('That code has expired. Select “Send a new code”.', 401);
  }
  if (u.otp_attempts >= 5) return fail('Too many wrong tries for this code. Select “Send a new code”.', 401);

  if (!otpMatches(code, u.otp_hash)) {
    await sql`UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ${u.id}`;
    await registerFailure(u.id);
    await audit(u, 'login_failed', u.email, 'wrong email code');
    return fail('That code is not right. Check your email and try again.', 401);
  }

  await sql`UPDATE users SET otp_hash = NULL, otp_expires = NULL, otp_attempts = 0,
            failed_attempts = 0, locked_until = NULL, last_login = now() WHERE id = ${u.id}`;
  await setSession(u);
  await audit(u, 'login', u.email, 'email code');
  return NextResponse.json({ ok: true, home: ROLE_HOME[u.role] });
}
