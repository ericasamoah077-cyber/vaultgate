import { NextResponse } from 'next/server';
import { ensureReady } from '@/lib/db';
import { runBackup } from '@/lib/backup';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Called daily by Vercel Cron (see vercel.json). Vercel sends  Authorization: Bearer $CRON_SECRET.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await ensureReady();
    await runBackup('auto', 'Scheduled backup');
    await audit(null, 'backup', 'cloud', 'scheduled');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('scheduled backup failed', e);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
