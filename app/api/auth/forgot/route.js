import { NextResponse } from 'next/server';
import { sql, ensureReady } from '@/lib/db';
import { sameOrigin } from '@/lib/session';
import { issueReset } from '@/lib/otp';
import { EMAIL_RE } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Emails a reset code. The answer is always the same, so nobody can use this
// form to find out which email addresses have accounts.
export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Blocked request.' }, { status: 403 });
  await ensureReady();
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const [u] = await sql`SELECT * FROM users WHERE email = ${email} AND status = 'active'`;
  if (u) {
    try {
      const r = await issueReset(u, { enforceCooldown: true });
      if (!r.wait) await audit(u, 'password_reset_requested', email);
    } catch (e) {
      console.error('could not send reset code', e);
    }
  }
  return NextResponse.json({ ok: true });
}
