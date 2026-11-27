import { NextResponse } from 'next/server';
import { sql, ensureReady } from '@/lib/db';
import { hashPassword, passwordProblem } from '@/lib/security';
import { setPending, sameOrigin } from '@/lib/session';
import { issueOtp, maskEmail } from '@/lib/otp';
import { registrationOpen, EMAIL_RE } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Public sign-up. Always creates a regular "user"; roles can only be raised by an admin.
export async function POST(req) {
  if (!sameOrigin(req)) return fail('Blocked request.', 403);
  if (!registrationOpen()) return fail('Registration is closed. Ask an administrator to add you.', 403);
  await ensureReady();

  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (name.length < 2 || name.length > 60) return fail('Enter your full name (2 to 60 characters).');
  if (!EMAIL_RE.test(email)) return fail('Enter a valid email address.');
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const taken = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (taken.length) return fail('An account with this email already exists. Try signing in instead.', 409);

  const { salt, hash } = await hashPassword(password);
  let u;
  try {
    [u] = await sql`INSERT INTO users (name, email, role, salt, password_hash)
                    VALUES (${name}, ${email}, 'user', ${salt}, ${hash}) RETURNING *`;
  } catch (e) {
    if (e?.code === '23505') return fail('An account with this email already exists. Try signing in instead.', 409);
    throw e;
  }
  await audit(u, 'user_registered', email);

  try {
    await issueOtp(u, { purpose: 'verify' });
  } catch (e) {
    console.error('could not send verification code', e);
    return fail('Your account was created, but we couldn’t email your code. Go to Sign in and we’ll send it again.', 502);
  }
  await setPending(u);
  return NextResponse.json({ step: 'code', sentTo: maskEmail(u.email) });
}
