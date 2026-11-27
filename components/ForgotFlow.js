'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function ForgotFlow() {
  const [step, setStep] = useState('email'); // email | reset | done
  const [email, setEmail] = useState('');
  const [f, setF] = useState({ code: '', password: '', again: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (step !== 'reset' || wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [step, wait]);

  async function sendCode(e) {
    e?.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    const r = await api('/api/auth/forgot', 'POST', { email });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error);
    if (step === 'email') setStep('reset'); else setInfo('If that account exists, a new code is on its way.');
    setWait(30);
  }

  async function reset(e) {
    e.preventDefault();
    setErr('');
    if (f.password !== f.again) return setErr('The passwords don’t match.');
    setBusy(true);
    const r = await api('/api/auth/reset', 'POST', { email, code: f.code, password: f.password });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error);
    setStep('done');
  }

  return (
    <div className="glass auth-card">
      {step === 'email' && (
        <form onSubmit={sendCode}>
          <h1>Forgot your password?</h1>
          <p className="sub">Enter your email and we’ll send you a code to choose a new one.</p>
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Sending…' : 'Email me a reset code'}</button>
          <p className="auth-foot"><Link href="/login">Back to sign in</Link></p>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={reset}>
          <h1>Choose a new password</h1>
          <p className="sub">If an account exists for <b>{email}</b>, we’ve emailed it a 6-digit code. It expires in 10 minutes.</p>
          <div className="field"><label htmlFor="code">6-digit code</label>
            <input id="code" className="input code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" autoFocus required value={f.code} onChange={set('code')} /></div>
          <div className="field"><label htmlFor="np">New password</label>
            <input id="np" type="password" className="input" autoComplete="new-password" required value={f.password} onChange={set('password')} />
            <small className="muted">At least 10 characters, with letters and a number.</small></div>
          <div className="field"><label htmlFor="np2">Repeat new password</label>
            <input id="np2" type="password" className="input" autoComplete="new-password" required value={f.again} onChange={set('again')} /></div>
          {info && <p style={{ color: 'var(--ok)', fontSize: '.88rem', margin: '4px 0 12px' }} role="status">{info}</p>}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
          <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button type="button" className="link" disabled={wait > 0 || busy} onClick={() => sendCode()} style={wait > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
              {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
            </button>
            <button type="button" className="link" onClick={() => { setStep('email'); setErr(''); setInfo(''); }}>Use a different email</button>
          </div>
          <p className="muted" style={{ fontSize: '.8rem', marginTop: 14 }}>Can’t see it? Check your spam folder.</p>
        </form>
      )}

      {step === 'done' && (
        <div>
          <h1>Password updated</h1>
          <p className="sub">You can sign in with your new password now. We’ve also emailed you a notice that it changed.</p>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>Go to sign in</Link>
        </div>
      )}
    </div>
  );
}
