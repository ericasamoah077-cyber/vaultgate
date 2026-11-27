import Link from 'next/link';

export default function Logo({ href = '/' }) {
  return (
    <Link href={href} className="logo" aria-label="VaultGate home">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#7c5cff" /><stop offset="1" stopColor="#19d9bb" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#vg)" />
        <path d="M9 11l7 11 7-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="8.5" r="1.8" fill="#fff" />
      </svg>
      VaultGate
    </Link>
  );
}
