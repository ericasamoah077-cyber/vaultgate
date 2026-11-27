import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import LoginFlow from '@/components/LoginFlow';
import { getUser } from '@/lib/session';
import { ROLE_HOME, registrationOpen } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create account — VaultGate' };

export default async function RegisterPage() {
  const u = await getUser();
  if (u) redirect(ROLE_HOME[u.role]);
  return (
    <AuthShell title="Join your organisation on VaultGate." text="Create your account in a minute. We’ll confirm your email with a one-time code.">
      {registrationOpen() ? <LoginFlow mode="register" /> : (
        <div className="glass auth-card">
          <h1>Registration is closed</h1>
          <p className="sub">New accounts are added by an administrator. Ask them to add you, then sign in here.</p>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
