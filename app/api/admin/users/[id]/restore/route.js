import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/session';
import { UUID_RE } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Admin: bring a deleted account back (including ones staff deleted).
export async function POST(req, { params }) {
  const { user: me, error } = await requireApi(req, ['admin']);
  if (error) return error;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  const [t] = await sql`SELECT id, email, status FROM users WHERE id = ${params.id}`;
  if (!t) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if (t.status !== 'deleted') return NextResponse.json({ error: 'This account is not deleted.' }, { status: 400 });

  await sql`UPDATE users SET status = 'active', deleted_at = NULL, deleted_by = NULL,
            failed_attempts = 0, locked_until = NULL WHERE id = ${t.id}`;
  await audit(me, 'user_restored', t.email);
  return NextResponse.json({ ok: true });
}
