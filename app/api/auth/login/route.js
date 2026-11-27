import { NextResponse } from 'next/server';
import { sql, ensureReady } from '@/lib/db';
import { verifyPassword, FAKE } from '@/lib/security';
import { setPending, sameOrigin } from '@/lib/session';
import { registerFailure, isLocked, lockMessage } from '@/lib/lockout';
import { audit } from '@/lib/audit';
import { issueOtp, maskEmail } from '@/lib/otp';

export const dynamic = 'force-dynamic';
const fail = (error, status) => NextResponse.json({ error }, { status });

export async function POST(req) {
  if (!sameOrigin(req)) return fail('Blocked request.', 403);
  await ensureReady();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return fail('Enter your email and password.', 400);

  const [u] = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (isLocked(u)) return fail(lockMessage(u), 423);

  let ok = false;
  if (u) ok = await verifyPassword(password, u.salt, u.password_hash);
  else await verifyPassword(password, FAKE.salt, FAKE.hash); // keep timing similar

  if (!u || u.status !== 'active' || !ok) {
    if (u && u.status === 'active') await registerFailure(u.id);
    await audit(u && u.status === 'active' ? { id: u.id, name: u.name } : null, 'login_failed', email);
    return fail('Email or password is incorrect.', 401);
  }

  try {
    await issueOtp(u);
  } catch (e) {
    console.error('could not send sign-in code', e);
    return fail('We couldn’t email your sign-in code. Please try again in a moment.', 502);
  }
  await setPending(u);
  return NextResponse.json({ step: 'code', sentTo: maskEmail(u.email) });
}
