import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/session';
import { runBackup } from '@/lib/backup';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { user: me, error } = await requireApi(req, ['admin']);
  if (error) return error;
  try {
    await runBackup('manual', me.name);
    await audit(me, 'backup', 'cloud', 'manual');
    return NextResponse.json({ ok: true, message: 'Backup completed' });
  } catch (e) {
    console.error('backup failed', e);
    return NextResponse.json(
      { error: 'Backup failed. Check that a Vercel Blob store is connected to this project.' },
      { status: 500 },
    );
  }
}
