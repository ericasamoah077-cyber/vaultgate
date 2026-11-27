import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/session';
import { UUID_RE } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Staff: delete a regular user. The user leaves the staff view; the admin still sees it, labelled Deleted.
export async function DELETE(req, { params }) {
  const { user: me, error } = await requireApi(req, ['staff']);
  if (error) return error;
  if (!UUID_RE.test(params.id)) return fail('User not found.', 404);
  const [t] = await sql`SELECT id, email, role, status FROM users WHERE id = ${params.id}`;
  if (!t || t.role !== 'user') return fail('User not found.', 404); // staff can never touch staff or admins
  if (t.status !== 'active') return fail('This user is already deleted.');

  await sql`UPDATE users SET status = 'deleted', deleted_at = now(), deleted_by = ${me.name} WHERE id = ${t.id}`;
  await audit(me, 'user_deleted', t.email);
  return NextResponse.json({ ok: true });
}
