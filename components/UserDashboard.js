'use client';
import { useEffect, useState } from 'react';
import { api, initials, fmtDate, fmtTime } from '@/lib/client';
import { describe, ACTIONS } from '@/lib/labels';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import AccountCard from './AccountCard';
import { useToast } from './Toast';

const TIPS = [
  'A long passphrase beats a short complex password. Four unrelated words are easy to remember and hard to guess.',
  'Never share your sign-in code, not even with someone who says they work here. Nobody legitimate will ask for it.',
  'Keep your email account secure too. Anyone who can read your inbox can read your sign-in codes.',
  'Use a different password for every account, so one leak can’t unlock the rest.',
  'If a sign-in prompt appears that you didn’t start, don’t approve it, and change your password.',
];

function greeting(d) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function UserDashboard({ me, checks, activity, tipIndex }) {
  const [now, setNow] = useState(null);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    await api('/api/auth/logout');
    window.location.href = '/login';
  }

  const score = checks.reduce((s, c) => s + (c.done ? c.pts : 0), 0);
  const first = me.name.split(' ')[0];
  const level = score >= 100 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Needs attention';

  return (
    <div className="member">
      <header className="member-nav">
        <Logo />
        <div className="row"><ThemeToggle /><button className="btn" onClick={logout}>Sign out</button></div>
      </header>

      <section className="glass u-hero">
        <h1>{now ? greeting(now) : 'Welcome'}, {first}.</h1>
        <p>{now ? now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '\u00a0'}</p>
      </section>

      {me.must_change_password && (
        <div className="banner" role="alert">You’re using a temporary password. Choose your own in <b>Account settings</b> below.</div>
      )}

      <div className="u-grid">
        <section className="glass card">
          <div className="profile-top">
            <div className="avatar lg">{initials(me.name)}</div>
            <div><h2>{me.name}</h2><p className="muted" style={{ fontSize: '.88rem', margin: '2px 0 8px' }}>{me.email}</p><span className="badge user">User</span></div>
          </div>
          <div className="facts">
            <div>Member since<b>{fmtDate(me.created_at)}</b></div>
            <div>Last sign-in<b>{fmtTime(me.last_login)}</b></div>
            <div>Two-step sign-in<b>Email code</b></div>
            <div>Account status<b>Active</b></div>
          </div>
        </section>

        <section className="glass card">
          <div className="card-head"><h2>Security health</h2></div>
          <div className="score">
            <div className="ring" style={{ '--p': score / 100 }} role="img" aria-label={`Security score ${score} out of 100`}><div>{score}</div></div>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 10 }}>{level}</p>
              <ul className="checks">{checks.map((c) => <li key={c.label} className={c.done ? 'done' : ''}>{c.label}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="glass card">
          <div className="card-head"><h2>Your recent activity</h2></div>
          <ul className="feed">
            {activity.map((a) => (
              <li key={a.id}><span className={`dot ${ACTIONS[a.action]?.tone || ''}`} /><span>{describe(a, me.id)}</span><time>{fmtTime(a.created_at)}</time></li>
            ))}
            {activity.length === 0 && <li className="muted">Your activity will show up here.</li>}
          </ul>
        </section>

        <section className="glass card tip">
          <div className="card-head"><h2>Security tip of the day</h2></div>
          <p style={{ lineHeight: 1.65 }}><b>{TIPS[tipIndex % TIPS.length].split('.')[0]}.</b>{TIPS[tipIndex % TIPS.length].split('.').slice(1).join('.')}</p>
        </section>
      </div>

      <h2 style={{ marginTop: 10 }}>Account settings</h2>
      <AccountCard me={me} onToast={toast} />
      {toastNode}
    </div>
  );
}
