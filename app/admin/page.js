import { sql, plain } from '@/lib/db';
import { requirePage } from '@/lib/session';
import AdminConsole from '@/components/AdminConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin — VaultGate' };

export default async function AdminPage() {
  const me = await requirePage(['admin']);
  const users = await sql`SELECT id, name, email, role, status, salt, password_hash, last_login,
                                 created_at, deleted_at, deleted_by
                          FROM users ORDER BY created_at DESC`;
  const audit = await sql`SELECT id, actor_name, action, target, detail, created_at
                          FROM audit_log ORDER BY id DESC LIMIT 100`;
  const backups = await sql`SELECT id, kind, size, created_by, created_at FROM backups ORDER BY id DESC LIMIT 25`;
  return <AdminConsole me={me} users={plain(users)} audit={plain(audit)} backups={plain(backups)} />;
}
