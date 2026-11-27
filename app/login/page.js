import { redirect } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import LoginFlow from '@/components/LoginFlow';
import { getUser } from '@/lib/session';
import { ROLE_HOME, registrationOpen } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — VaultGate' };

export default async function LoginPage() {
  const u = await getUser();
  if (u) redirect(ROLE_HOME[u.role]);
  return (
    <AuthShell title="Your team’s front door, with two locks." text="Every sign-in is checked twice: your password, then a one-time code we send to your email.">
      <LoginFlow mode="login" canRegister={registrationOpen()} />
    </AuthShell>
  );
}
