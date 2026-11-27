'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

// mode 'login' = sign in; mode 'register' = create an account. Both finish with the emailed code.
export default function LoginFlow({ mode = 'login', canRegister = true }) {
  const reg = mode === 'register';
  const [step, setStep] = useState('creds'); // creds | code
  const [f, setF] = useState({ name: '', email: '', password: '', again: '' });
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (step !== 'code' || wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [step, wait]);

  async function submitCreds(e) {
    e.preventDefault();
    setErr('');
    if (reg && f.password !== f.again) return setErr('The passwords don’t match.');
    setBusy(true);
    const r = reg
      ? await api('/api/auth/register', 'POST', { name: f.name, email: f.email, password: f.password })
      : await api('/api/auth/login', 'POST', { email: f.email, password: f.password });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error || 'Something went wrong. Try again.');
    setF({ ...f, password: '', again: '' });
    setCode(''); setInfo(''); setWait(30);
    setSentTo(r.data.sentTo);
    setStep('code');
  }

  async function submitCode(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const r = await api('/api/auth/2fa', 'POST', { code });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 401 && /sign-in expired/i.test(r.data.error || '')) setStep('creds');
      return setErr(r.data.error || 'Something went wrong. Try again.');
    }
    window.location.href = r.data.home;
  }

  async function resend() {
    setErr(''); setInfo('');
    const r = await api('/api/auth/2fa/resend', 'POST');
    if (r.ok) { setInfo('A new code is on its way.'); setWait(30); setCode(''); }
    else { setErr(r.data.error); if (r.data.wait) setWait(r.data.wait); }
  }

  return (
    <div className="glass auth-card">
      <div className="steps" aria-hidden="true"><i className="on" /><i className={step === 'code' ? 'on' : ''} /></div>

      {step === 'creds' && (
        <form onSubmit={submitCreds}>
          <h1>{reg ? 'Create your account' : 'Welcome back'}</h1>
          <p className="sub">{reg ? 'It takes a minute. We’ll email you a code to confirm your address.' : 'Sign in with your email and password. We’ll email you a code next.'}</p>
          {reg && (
            <div className="field"><label htmlFor="name">Full name</label>
              <input id="name" className="input" autoComplete="name" required value={f.name} onChange={set('name')} /></div>
          )}
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="username" required value={f.email} onChange={set('email')} /></div>
          <div className="field"><label htmlFor="password">Password</label>
            <input id="password" type="password" className="input" autoComplete={reg ? 'new-password' : 'current-password'} required value={f.password} onChange={set('password')} />
            {reg && <small className="muted">At least 10 characters, with letters and a number.</small>}
          </div>
          {reg && (
            <div className="field"><label htmlFor="again">Repeat password</label>
              <input id="again" type="password" className="input" autoComplete="new-password" required value={f.again} onChange={set('again')} /></div>
          )}
          {!reg && <div style={{ textAlign: 'right', margin: '-4px 0 14px' }}><Link href="/forgot" className="link">Forgot password?</Link></div>}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? (reg ? 'Creating account…' : 'Sending your code…') : reg ? 'Create account' : 'Continue'}
          </button>
          <p className="auth-foot">
            {reg ? <>Already have an account? <Link href="/login">Sign in</Link></>
              : canRegister ? <>New here? <Link href="/register">Create an account</Link></> : null}
          </p>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={submitCode}>
          <h1>Check your email</h1>
          <p className="sub">We sent a 6-digit code to <b>{sentTo}</b>. It expires in 10 minutes.</p>
          <div className="field"><label htmlFor="code" className="sr">6-digit code</label>
            <input id="code" className="input code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" autoFocus required value={code} onChange={(e) => setCode(e.target.value)} /></div>
          {info && <p style={{ color: 'var(--ok)', fontSize: '.88rem', margin: '4px 0 12px' }} role="status">{info}</p>}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Verifying…' : reg ? 'Confirm and continue' : 'Verify and sign in'}</button>
          <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button type="button" className="link" disabled={wait > 0} onClick={resend} style={wait > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
              {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
            </button>
            <button type="button" className="link" onClick={() => { setStep('creds'); setErr(''); }}>Go back</button>
          </div>
          <p className="muted" style={{ fontSize: '.8rem', marginTop: 14 }}>Can’t see it? Check your spam folder.</p>
        </form>
      )}
    </div>
  );
}
