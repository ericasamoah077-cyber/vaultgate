'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

// Name + password settings, shared by the admin, staff and member dashboards.
export default function AccountCard({ me, onToast }) {
  const router = useRouter();
  const [name, setName] = useState(me.name);
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function saveName(e) {
    e.preventDefault();
    const r = await api('/api/me', 'PATCH', { name });
    onToast(r.ok ? 'Name updated' : r.data.error, r.ok ? 'ok' : 'err');
    if (r.ok) router.refresh();
  }

  async function savePassword(e) {
    e.preventDefault();
    setErr('');
    if (pw.next !== pw.again) return setErr('The new passwords don’t match.');
    setBusy(true);
    const r = await api('/api/me', 'PATCH', { currentPassword: pw.current, newPassword: pw.next });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error);
    setPw({ current: '', next: '', again: '' });
    onToast('Password updated', 'ok');
    router.refresh();
  }

  return (
    <div className="u-grid">
      <form className="glass card" onSubmit={saveName}>
        <div className="card-head"><h2>Your details</h2></div>
        <div className="field"><label htmlFor="acc-name">Full name</label>
          <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="acc-email">Email</label>
          <input id="acc-email" className="input" value={me.email} disabled /></div>
        <button className="btn btn-primary">Save name</button>
      </form>
      <form className="glass card" onSubmit={savePassword}>
        <div className="card-head"><h2>Change password</h2></div>
        <div className="field"><label htmlFor="pw-cur">Current password</label>
          <input id="pw-cur" type="password" className="input" autoComplete="current-password" value={pw.current}
                 onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
        <div className="field"><label htmlFor="pw-new">New password</label>
          <input id="pw-new" type="password" className="input" autoComplete="new-password" value={pw.next}
                 onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
        <div className="field"><label htmlFor="pw-again">Repeat new password</label>
          <input id="pw-again" type="password" className="input" autoComplete="new-password" value={pw.again}
                 onChange={(e) => setPw({ ...pw, again: e.target.value })} /></div>
        <p className="muted" style={{ fontSize: '.82rem', marginBottom: 12 }}>At least 10 characters, with letters and a number.</p>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  );
}
