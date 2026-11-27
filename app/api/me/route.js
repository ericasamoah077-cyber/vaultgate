import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/session';
import { hashPassword, verifyPassword, passwordProblem } from '@/lib/security';
import { audit } from '@/lib/audit';
import { sendPasswordChangedEmail } from '@/lib/mail';

export const dynamic = 'force-dynamic';
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Any signed-in member: update own name, or change own password.
export async function PATCH(req) {
  const { user: me, error } = await requireApi(req);
  if (error) return error;
  const b = await req.json().catch(() => ({}));

  if (typeof b.name === 'string') {
    const name = b.name.trim();
    if (name.length < 2 || name.length > 60) return fail('Use between 2 and 60 characters for your name.');
    await sql`UPDATE users SET name = ${name} WHERE id = ${me.id}`;
    await audit(me, 'profile_updated', me.email, 'name');
    return NextResponse.json({ ok: true });
  }

  if (b.newPassword) {
    const [row] = await sql`SELECT salt, password_hash FROM users WHERE id = ${me.id}`;
    if (!(await verifyPassword(String(b.currentPassword || ''), row.salt, row.password_hash))) {
      return fail('Your current password is incorrect.', 403);
    }
    const problem = passwordProblem(String(b.newPassword));
    if (problem) return fail(problem);
    const { salt, hash } = await hashPassword(String(b.newPassword));
    await sql`UPDATE users SET salt = ${salt}, password_hash = ${hash}, must_change_password = false,
              pw_changed_at = now() WHERE id = ${me.id}`;
    await audit(me, 'password_changed', me.email);
    sendPasswordChangedEmail(me.email, me.name).catch((e) => console.error('notice email failed', e));
    return NextResponse.json({ ok: true });
  }

  return fail('Nothing to update.');
}
