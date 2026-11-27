'use client';
import { useMemo, useState } from 'react';
import { api, initials, fmtDate, fmtTime, randomPassword } from '@/lib/client';

// Used for "Members" (everything) and "Deleted accounts" (preset = 'deleted').
export default function MembersTable({ users, me, preset = 'all', toast, onChanged }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState(preset === 'deleted' ? 'deleted' : 'all');
  const [shown, setShown] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => users.filter((u) =>
    (role === 'all' || u.role === role) &&
    (status === 'all' || u.status === status) &&
    (`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
  ), [users, q, role, status]);

  const toggle = (id) => setShown((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function run(promise, okMsg) {
    setBusy(true);
    const r = await promise;
    setBusy(false);
    toast(r.ok ? okMsg : r.data.error, r.ok ? 'ok' : 'err');
    if (r.ok) onChanged();
    return r.ok;
  }

  const changeRole = (u, next) => run(api(`/api/admin/users/${u.id}`, 'PATCH', { role: next }), `${u.name} is now ${next}`);
  const restore = (u) => run(api(`/api/admin/users/${u.id}/restore`, 'POST'), `${u.name} restored`);
  async function doDelete() {
    const u = confirm;
    if (await run(api(`/api/admin/users/${u.id}`, 'DELETE'), `${u.name} deleted. You can restore them anytime.`)) setConfirm(null);
  }

  return (
    <section className="glass card">
      <div className="toolbar">
        <input className="input" placeholder="Search name or email" aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select select-sm" aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option><option value="admin">Admin</option><option value="staff">Staff</option><option value="user">User</option>
        </select>
        {preset !== 'deleted' && (
          <select className="select select-sm" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option><option value="active">Active</option><option value="deleted">Deleted</option>
          </select>
        )}
        {preset !== 'deleted' && <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setAdding(true)}>Add member</button>}
      </div>

      {rows.length === 0 ? (
        <p className="empty">{preset === 'deleted' ? 'No deleted accounts. Anyone you or staff delete will wait here to be restored.' : 'No members match your search.'}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Joined</th><th>Salt and password hash</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const deleted = u.status === 'deleted';
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className={deleted ? 'is-deleted' : ''}>
                    <td><div className="person"><div className="avatar">{initials(u.name)}</div><div><strong>{u.name}{self && ' (you)'}</strong><small>{u.email}</small></div></div></td>
                    <td>
                      {deleted || self ? <span className={`badge ${u.role}`}>{u.role}</span> : (
                        <select className="select select-sm" aria-label={`Role for ${u.name}`} value={u.role} disabled={busy} onChange={(e) => changeRole(u, e.target.value)}>
                          <option value="admin">Admin</option><option value="staff">Staff</option><option value="user">User</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {deleted ? <><span className="badge deleted">Deleted</span><small className="muted" style={{ display: 'block', marginTop: 4 }}>by {u.deleted_by || 'unknown'} · {fmtDate(u.deleted_at)}</small></> : <span className="badge on">Active</span>}
                    </td>
                    <td>{fmtTime(u.last_login)}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      <div className="hashcell">
                        {shown.has(u.id) ? (<><code>salt: {u.salt}</code><code>hash: {u.password_hash}</code></>) : <code>•••••••••••• ••••••••••••</code>}
                        <button className="link" style={{ justifySelf: 'start' }} onClick={() => toggle(u.id)}>{shown.has(u.id) ? 'Hide' : 'Reveal'}</button>
                      </div>
                    </td>
                    <td>
                      {deleted ? <button className="btn btn-ok btn-sm" disabled={busy} onClick={() => restore(u)}>Restore</button>
                        : self ? <span className="muted">—</span>
                        : <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm(u)}>Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Delete {confirm.name}?</h2>
            <p className="sub">They will no longer be able to sign in. The account moves to Deleted accounts, and you can restore it anytime.</p>
            <div className="actions">
              <button className="btn" onClick={() => setConfirm(null)}>Keep member</button>
              <button className="btn btn-danger" disabled={busy} onClick={doDelete}>Delete member</button>
            </div>
          </div>
        </div>
      )}

      {adding && <AddMember onClose={() => setAdding(false)} toast={toast} onChanged={onChanged} />}
    </section>
  );
}

function AddMember({ onClose, toast, onChanged }) {
  const [f, setF] = useState({ name: '', email: '', role: 'user', password: randomPassword() });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const r = await api('/api/admin/users', 'POST', f);
    setBusy(false);
    if (!r.ok) return setErr(r.data.error);
    toast(`${f.name} added as ${f.role}. Share the temporary password securely.`, 'ok');
    onChanged();
    onClose();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Add a member</h2>
        <p className="sub">They’ll sign in with this temporary password plus a code we email to them, and can change the password afterwards. Use their real email address.</p>
        <div className="field"><label htmlFor="am-name">Full name</label><input id="am-name" className="input" required value={f.name} onChange={set('name')} /></div>
        <div className="field"><label htmlFor="am-email">Email</label><input id="am-email" type="email" className="input" required value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="am-role">Role</label>
          <select id="am-role" className="select" value={f.role} onChange={set('role')}><option value="user">User</option><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
        <div className="field"><label htmlFor="am-pw">Temporary password</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input id="am-pw" className="input mono" required value={f.password} onChange={set('password')} />
            <button type="button" className="btn btn-sm" onClick={() => setF({ ...f, password: randomPassword() })}>Generate</button>
          </div></div>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add member'}</button>
        </div>
      </form>
    </div>
  );
}
