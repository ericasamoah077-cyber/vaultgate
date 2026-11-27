import { NextResponse } from 'next/server';
import { sql, ensureReady } from '@/lib/db';
import { getPendingUserId, sameOrigin } from '@/lib/session';
import { issueOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';
const fail = (error, status, extra = {}) => NextResponse.json({ error, ...extra }, { status });

// Send a new code (at most once every 30 seconds).
export async function POST(req) {
  if (!sameOrigin(req)) return fail('Blocked request.', 403);
  await ensureReady();
  const id = await getPendingUserId();
  const [u] = id ? await sql`SELECT * FROM users WHERE id = ${id} AND status = 'active'` : [];
  if (!u) return fail('Your sign-in expired. Start again.', 401);
  try {
    const r = await issueOtp(u, { enforceCooldown: true });
    if (r.wait) return fail(`Please wait ${r.wait} seconds before asking for another code.`, 429, { wait: r.wait });
  } catch (e) {
    console.error('could not resend sign-in code', e);
    return fail('We couldn’t email your code. Please try again in a moment.', 502);
  }
  return NextResponse.json({ ok: true });
}
