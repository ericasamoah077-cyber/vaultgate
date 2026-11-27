import { NextResponse } from 'next/server';
import { clearSession, getUser } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST() {
  const u = await getUser();
  if (u) await audit(u, 'logout', u.email);
  clearSession();
  return NextResponse.json({ ok: true });
}
