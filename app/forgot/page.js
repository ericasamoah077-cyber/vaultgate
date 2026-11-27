import { redirect } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import ForgotFlow from '@/components/ForgotFlow';
import { getUser } from '@/lib/session';
import { ROLE_HOME } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reset password — VaultGate' };

export default async function ForgotPage() {
  const u = await getUser();
  if (u) redirect(ROLE_HOME[u.role]);
  return (
    <AuthShell title="Locked out? It happens." text="We’ll email you a code, you choose a new password, and you’re back in.">
      <ForgotFlow />
    </AuthShell>
  );
}
