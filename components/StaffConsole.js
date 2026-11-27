'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from './Shell';
import AccountCard from './AccountCard';
import { useToast } from './Toast';
import { api, initials, fmtDate, fmtTime } from '@/lib/client';

export default function StaffConsole({ me, users, newThisWeek, activeWeek }) {
  const router = useRouter();
  const [tab, setTab] = useState('users');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toastNode, toast] = useToast();

  const rows = useMemo(() => users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [users, q]);

  async function remove() {
    setBusy(true);
    const r = await api(`/api/staff/users/${confirm.id}`, 'DELETE');
    setBusy(false);
    toast(r.ok ? `${confirm.name} was deleted` : r.data.error, r.ok ? 'ok' : 'err');
    if (r.ok) { setConfirm(null); router.refresh(); }
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: 'users', count: users.length },
    { id: 'account', label: 'My account', icon: 'key' },
  ];

  return (
    <Shell me={me} tabs={tabs} tab={tab} setTab={setTab} title={tab === 'users' ? 'Staff workspace' : 'My account'}>
      {tab === 'users' && (
        <>
          <div className="tiles">
            <div className="glass tile t-amber"><div className="num">{users.length}</div><div className="lbl">Active users</div></div>
            <div className="glass tile t-teal"><div className="num">{newThisWeek}</div><div className="lbl">Joined this week</div></div>
            <div className="glass tile t-violet"><div className="num">{activeWeek}</div><div className="lbl">Signed in this week</div></div>
          </div>
          <section className="glass card">
            <div className="toolbar">
              <input className="input" placeholder="Search name or email" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {rows.length === 0 ? <p className="empty">{users.length ? 'No users match your search.' : 'There are no active users right now.'}</p> : (
              <div className="table-wrap"><table>
                <thead><tr><th>User</th><th>Joined</th><th>Last sign-in</th><th>Actions</th></tr></thead>
                <tbody>{rows.map((u) => (
                  <tr key={u.id}>
                    <td><div className="person"><div className="avatar">{initials(u.name)}</div><div><strong>{u.name}</strong><small>{u.email}</small></div></div></td>
                                        <td>{fmtDate(u.created_at)}</td><td>{fmtTime(u.last_login)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setConfirm(u)}>Delete</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </>
      )}
      {tab === 'account' && <AccountCard me={me} onToast={toast} />}

      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Delete {confirm.name}?</h2>
            <p className="sub">They will lose access and disappear from this list. An admin can restore the account later.</p>
            <div className="actions">
              <button className="btn" onClick={() => setConfirm(null)}>Keep user</button>
              <button className="btn btn-danger" disabled={busy} onClick={remove}>Delete user</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </Shell>
  );
}
