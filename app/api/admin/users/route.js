import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/session';
import { hashPassword, passwordProblem } from '@/lib/security';
import { ROLES, EMAIL_RE } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Admin: add a member with a role and a temporary password.
export async function POST(req) {
  const { user: me, error } = await requireApi(req, ['admin']);
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  if (name.length < 2) return fail('Enter the member’s full name.');
  if (!EMAIL_RE.test(email)) return fail('Enter a valid email address.');
  if (!ROLES.includes(b.role)) return fail('Choose a role.');
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const taken = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (taken.length) return fail('A member with this email already exists.', 409);

  const { salt, hash } = await hashPassword(password);
  await sql`INSERT INTO users (name, email, role, salt, password_hash, must_change_password)
            VALUES (${name}, ${email}, ${b.role}, ${salt}, ${hash}, true)`;
  await audit(me, 'user_created', email, `role: ${b.role}`);
  return NextResponse.json({ ok: true });
}
