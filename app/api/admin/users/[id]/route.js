import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/session';
import { ROLES, UUID_RE } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

async function target(id) {
  if (!UUID_RE.test(id)) return null;
  const [t] = await sql`SELECT id, name, email, role, status FROM users WHERE id = ${id}`;
  return t || null;
}

// Admin: change a member's role.
export async function PATCH(req, { params }) {
  const { user: me, error } = await requireApi(req, ['admin']);
  if (error) return error;
  const t = await target(params.id);
  if (!t) return fail('Member not found.', 404);
  const { role } = await req.json().catch(() => ({}));
  if (!ROLES.includes(role)) return fail('Choose a role.');
  if (t.id === me.id) return fail('You can’t change your own role.');
  if (t.status !== 'active') return fail('Restore this account before changing its role.');
  if (t.role === role) return NextResponse.json({ ok: true });

  await sql`UPDATE users SET role = ${role} WHERE id = ${t.id}`;
  await audit(me, 'role_changed', t.email, `${t.role} → ${role}`);
  return NextResponse.json({ ok: true });
}

// Admin: delete a member. This is a soft delete, so it can be restored.
export async function DELETE(req, { params }) {
  const { user: me, error } = await requireApi(req, ['admin']);
  if (error) return error;
  const t = await target(params.id);
  if (!t) return fail('Member not found.', 404);
  if (t.id === me.id) return fail('You can’t delete your own account.');
  if (t.status === 'deleted') return fail('This account is already deleted.');

  await sql`UPDATE users SET status = 'deleted', deleted_at = now(), deleted_by = ${me.name} WHERE id = ${t.id}`;
  await audit(me, 'user_deleted', t.email);
  return NextResponse.json({ ok: true });
}
