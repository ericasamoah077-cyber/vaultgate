'use client';
import Icon from './Icon';

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('vg-theme', next); } catch {}
  }
  return (
    <button className="btn theme-btn" onClick={toggle} aria-label="Switch between light and dark mode" title="Switch theme">
      <Icon name="sun" />
    </button>
  );
}
