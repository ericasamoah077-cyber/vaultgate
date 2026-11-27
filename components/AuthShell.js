import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

export default function AuthShell({ title, text, children }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <Logo />
        <div><h2>{title}</h2><p>{text}</p></div>
        <span className="muted" style={{ fontSize: '.85rem' }}>Identity, secured.</span>
      </section>
      <section className="auth-form">
        <div style={{ position: 'absolute', top: 20, right: 20 }}><ThemeToggle /></div>
        {children}
      </section>
    </div>
  );
}
