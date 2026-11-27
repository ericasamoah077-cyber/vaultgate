export const ROLES = ['admin', 'staff', 'user'];
export const ROLE_HOME = { admin: '/admin', staff: '/staff', user: '/dashboard' };
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Set ALLOW_REGISTRATION=false in Vercel to close public sign-up (admins can still add members).
export const registrationOpen = () => process.env.ALLOW_REGISTRATION !== 'false';
