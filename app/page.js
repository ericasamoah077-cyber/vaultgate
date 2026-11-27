import Link from 'next/link';
import Logo from '@/components/Logo';
import Icon from '@/components/Icon';
import ThemeToggle from '@/components/ThemeToggle';
import HeroCode from '@/components/HeroCode';
import { registrationOpen } from '@/lib/constants';

const FEATURES = [
  ['lock', 'Salted and peppered passwords', 'Every password gets its own random salt plus a secret pepper kept outside the database, then is hashed with scrypt.'],
  ['shield', 'Two-factor sign-in by email', 'After the password, a 6-digit code is emailed to you. Nothing to install and nothing to scan.'],
  ['roles', 'Role-based dashboards', 'Admins, staff and members each get their own workspace, enforced on the server, not just hidden in the menu.'],
  ['trash', 'Delete without losing', 'Deleted accounts move to a recycle bin that only admins can see and restore.'],
  ['cloud', 'Encrypted cloud backups', 'A daily backup and a one-click backup button save encrypted snapshots to cloud storage.'],
  ['log', 'A full audit trail', 'Sign-ins, deletions, restores and role changes are recorded with who did them and when.'],
];

export default function Home() {
  const canRegister = registrationOpen();
  return (
    <div className="landing">
      <header className="nav">
        <Logo />
        <div className="row">
          <ThemeToggle />
          <Link href="/login" className="btn">Sign in</Link>
          {canRegister && <Link href="/register" className="btn btn-primary">Create account</Link>}
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>Know who is in. <span>Decide what they can reach.</span></h1>
          <p className="lead">
            VaultGate checks every sign-in with a password and a code sent to your email, then shows each person only what their role allows.
          </p>
          <div className="row">
            {canRegister
              ? <Link href="/register" className="btn btn-primary">Create your account</Link>
              : <Link href="/login" className="btn btn-primary">Sign in to your workspace</Link>}
            {canRegister && <Link href="/login" className="btn">Sign in</Link>}
            <a href="#features" className="btn">See how it works</a>
          </div>
        </div>
        <div className="glass otp">
          <HeroCode />
          <div className="rolelist">
            <div><span className="badge admin">admin</span><span className="t">Manages members, roles and backups</span></div>
            <div><span className="badge staff">staff</span><span className="t">Looks after users and removes accounts</span></div>
            <div><span className="badge user">user</span><span className="t">Keeps their profile and security up to date</span></div>
          </div>
        </div>
      </section>

      <section id="features">
        <h2 className="section-title">Everything an organisation needs to let the right people in.</h2>
        <div className="features">
          {FEATURES.map(([icon, title, text]) => (
            <article key={title} className="glass card">
              <div className="ico"><Icon name={icon} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="foot">
        <span>© {new Date().getFullYear()} VaultGate. Identity, secured.</span>
        <span>Built for Vercel</span>
      </footer>
    </div>
  );
}
