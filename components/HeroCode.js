'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';

// Illustrative "email" card: a sample code that changes every few seconds.
export default function HeroCode() {
  const [code, setCode] = useState('••• •••');
  useEffect(() => {
    const next = () => {
      const n = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      setCode(`${n.slice(0, 3)} ${n.slice(3)}`);
    };
    next();
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <div className="row" style={{ gap: 12, marginBottom: 14 }}>
        <div className="ico"><Icon name="shield" /></div>
        <div><strong>Your VaultGate sign-in code</strong><p className="muted" style={{ fontSize: '.84rem' }}>Sent to your inbox · expires in 10 minutes</p></div>
      </div>
      <div className="digits" style={{ textAlign: 'center', padding: '14px', borderRadius: 14, background: 'var(--glass)', border: '1px solid var(--line)' }} aria-label="Example one-time code">{code}</div>
    </div>
  );
}
