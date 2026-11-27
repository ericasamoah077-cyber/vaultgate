'use client';
import Logo from './Logo';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import { api, initials } from '@/lib/client';

export default function Shell({ me, tabs, tab, setTab, title, children }) {
  async function logout() {
    await api('/api/auth/logout');
    window.location.href = '/login';
  }
  return (
    <div className="shell">
      <aside className="sidebar glass">
        <Logo href="/" />
        <nav aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} /><span>{t.label}</span>
              {t.count != null && <em>{t.count}</em>}
            </button>
          ))}
        </nav>
        <div className="me">
          <div className="avatar">{initials(me.name)}</div>
          <div><strong>{me.name}</strong><span className={`badge ${me.role}`}>{me.role}</span></div>
        </div>
        <button className="btn" onClick={logout}>Sign out</button>
      </aside>
      <main className="main">
        <header className="topbar"><h1>{title}</h1><ThemeToggle /></header>
        {children}
      </main>
    </div>
  );
}
