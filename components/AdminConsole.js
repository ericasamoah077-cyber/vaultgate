'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from './Shell';
import MembersTable from './MembersTable';
import AccountCard from './AccountCard';
import { useToast } from './Toast';
import { api, fmtTime } from '@/lib/client';
import { ACTIONS } from '@/lib/labels';

export default function AdminConsole({ me, users, audit, backups }) {
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [toastNode, toast] = useToast();
  const [backing, setBacking] = useState(false);

  const active = users.filter((u) => u.status === 'active');
  const count = (r) => active.filter((u) => u.role === r).length;
  const deleted = users.filter((u) => u.status === 'deleted');
  const pct = (n) => (active.length ? (n / active.length) * 100 : 0);
  const refresh = () => router.refresh();

  async function backup() {
    setBacking(true);
    const r = await api('/api/admin/backup', 'POST');
    setBacking(false);
    toast(r.ok ? r.data.message : r.data.error, r.ok ? 'ok' : 'err');
    if (r.ok) refresh();
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'members', label: 'Members', icon: 'users', count: users.length },
    { id: 'deleted', label: 'Deleted accounts', icon: 'trash', count: deleted.length },
    { id: 'audit', label: 'Audit log', icon: 'log' },
    { id: 'backups', label: 'Backups', icon: 'cloud' },
    { id: 'account', label: 'My account', icon: 'key' },
  ];
  const titles = { overview: 'Admin overview', members: 'Members', deleted: 'Deleted accounts', audit: 'Audit log', backups: 'Backups', account: 'My account' };

  const BackupButton = () => (
    <button className="btn btn-teal" onClick={backup} disabled={backing}>{backing ? 'Backing up…' : 'Backup now'}</button>
  );

  return (
    <Shell me={me} tabs={tabs} tab={tab} setTab={setTab} title={titles[tab]}>
      {tab === 'overview' && (
        <>
          <div className="tiles">
            <div className="glass tile t-violet"><div className="num">{active.length}</div><div className="lbl">Active members</div></div>
            <div className="glass tile t-teal"><div className="num">{count('staff')}</div><div className="lbl">Staff</div></div>
            <div className="glass tile t-amber"><div className="num">{count('user')}</div><div className="lbl">Users</div></div>
            <div className="glass tile t-red"><div className="num">{deleted.length}</div><div className="lbl">Deleted accounts</div></div>
          </div>
          <div className="split">
            <section className="glass card">
              <div className="card-head"><h2>Recent activity</h2><button className="link" onClick={() => setTab('audit')}>View all</button></div>
              <ul className="feed">
                {audit.slice(0, 7).map((a) => (
                  <li key={a.id}><span className={`dot ${ACTIONS[a.action]?.tone || ''}`} />
                    <span><strong>{a.actor_name}</strong> · {ACTIONS[a.action]?.text || a.action}{a.target && <span className="muted"> · {a.target}</span>}</span>
                    <time>{fmtTime(a.created_at)}</time></li>
                ))}
                {audit.length === 0 && <li className="muted">Nothing has happened yet.</li>}
              </ul>
            </section>
            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              <section className="glass card">
                <div className="card-head"><h2>Who has access</h2></div>
                <div className="rolebar" role="img" aria-label="Share of active members by role">
                  <i style={{ width: `${pct(count('admin'))}%`, background: 'var(--violet)' }} />
                  <i style={{ width: `${pct(count('staff'))}%`, background: 'var(--teal)' }} />
                  <i style={{ width: `${pct(count('user'))}%`, background: 'var(--amber)' }} />
                </div>
                <div className="legend"><span><b>{count('admin')}</b> admin</span><span><b>{count('staff')}</b> staff</span><span><b>{count('user')}</b> user</span></div>
              </section>
              <section className="glass card">
                <div className="card-head"><h2>Cloud backup</h2></div>
                <p className="muted" style={{ marginBottom: 14, fontSize: '.9rem' }}>
                  Last backup: <b style={{ color: 'var(--text)' }}>{backups[0] ? fmtTime(backups[0].created_at) : 'none yet'}</b>. A scheduled backup also runs every day.
                </p>
                <BackupButton />
              </section>
            </div>
          </div>
        </>
      )}

      {tab === 'members' && <MembersTable users={users} me={me} toast={toast} onChanged={refresh} />}
      {tab === 'deleted' && <MembersTable users={users} me={me} preset="deleted" toast={toast} onChanged={refresh} />}

      {tab === 'audit' && (
        <section className="glass card">
          {audit.length === 0 ? <p className="empty">No activity recorded yet.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
              <tbody>{audit.map((a) => (
                <tr key={a.id}><td style={{ whiteSpace: 'nowrap' }}>{fmtTime(a.created_at)}</td><td>{a.actor_name}</td>
                  <td><span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><span className={`dot ${ACTIONS[a.action]?.tone || ''}`} />{ACTIONS[a.action]?.text || a.action}</span></td>
                  <td>{a.target || '—'}</td><td className="muted">{a.detail || '—'}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}

      {tab === 'backups' && (
        <section className="glass card">
          <div className="card-head"><h2>Backup history</h2><BackupButton /></div>
          <p className="muted" style={{ fontSize: '.88rem', marginBottom: 14 }}>
            Snapshots of every account (including deleted ones) are encrypted and stored in cloud storage. Scheduled backups run daily.
          </p>
          {backups.length === 0 ? <p className="empty">No backups yet. Select Backup now to create the first one.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>When</th><th>Type</th><th>Started by</th><th>Size</th></tr></thead>
              <tbody>{backups.map((b) => (
                <tr key={b.id}><td>{fmtTime(b.created_at)}</td>
                  <td><span className={`badge ${b.kind === 'auto' ? 'staff' : 'admin'}`}>{b.kind === 'auto' ? 'Scheduled' : 'Manual'}</span></td>
                  <td>{b.created_by}</td><td>{(b.size / 1024).toFixed(1)} KB</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}

      {tab === 'account' && <AccountCard me={me} onToast={toast} />}
      {toastNode}
    </Shell>
  );
}
