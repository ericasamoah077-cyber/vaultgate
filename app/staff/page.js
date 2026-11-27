import { sql, plain } from '@/lib/db';
import { requirePage } from '@/lib/session';
import StaffConsole from '@/components/StaffConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff — VaultGate' };

export default async function StaffPage() {
  const me = await requirePage(['staff']);
  // Staff only ever see active users: no hashes, no admins, no other staff, no deleted accounts.
  const users = await sql`SELECT id, name, email, created_at, last_login
                          FROM users WHERE role = 'user' AND status = 'active' ORDER BY created_at DESC`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users
                            WHERE role = 'user' AND status = 'active' AND created_at > now() - interval '7 days'`;
  const [{ w }] = await sql`SELECT count(*)::int AS w FROM users
                            WHERE role = 'user' AND status = 'active' AND last_login > now() - interval '7 days'`;
  return <StaffConsole me={me} users={plain(users)} newThisWeek={n} activeWeek={w} />;
}
