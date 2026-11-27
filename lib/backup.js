import { put } from '@vercel/blob';
import { sql } from './db';
import { encryptJSON } from './security';

// Snapshot of every account (including deleted ones) and recent audit log, encrypted
// with AES-256-GCM before upload to Vercel Blob.
export async function runBackup(kind, by) {
  const users = await sql`SELECT * FROM users ORDER BY created_at`;
  const auditLog = await sql`SELECT * FROM audit_log ORDER BY id DESC LIMIT 1000`;
  const buf = encryptJSON({ app: 'VaultGate', createdAt: new Date().toISOString(), kind, users, auditLog });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const blob = await put(`backups/vaultgate-${stamp}.json.enc`, buf, {
    access: 'public', // URL is unguessable and the file is encrypted
    contentType: 'application/octet-stream',
    addRandomSuffix: true,
  });
  await sql`INSERT INTO backups (url, size, kind, created_by) VALUES (${blob.url}, ${buf.length}, ${kind}, ${by})`;
  return { size: buf.length };
}
