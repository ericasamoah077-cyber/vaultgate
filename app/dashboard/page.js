import { sql, plain } from '@/lib/db';
import { requirePage } from '@/lib/session';
import UserDashboard from '@/components/UserDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My dashboard — VaultGate' };

export default async function DashboardPage() {
  const me = await requirePage(['user']);
  const activity = await sql`SELECT id, actor_id, action, detail, created_at FROM audit_log
    WHERE (actor_id = ${me.id} AND action IN ('login','password_changed','password_reset','profile_updated','user_registered'))
       OR (target = ${me.email} AND action IN ('role_changed','user_created','user_restored'))
    ORDER BY id DESC LIMIT 8`;

  const ageDays = (Date.now() - new Date(me.pw_changed_at).getTime()) / 86400000;
  const checks = [
    { label: 'Email code is checked on every sign-in', pts: 40, done: true },
    { label: 'You chose your own password', pts: 30, done: !me.must_change_password },
    { label: 'Password changed in the last 90 days', pts: 30, done: ageDays < 90 },
  ];
  const tipIndex = Math.floor(Date.now() / 86400000);
  return <UserDashboard me={me} checks={checks} activity={plain(activity)} tipIndex={tipIndex} />;
}
