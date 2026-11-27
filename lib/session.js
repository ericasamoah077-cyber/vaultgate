import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { sql, ensureReady, plain } from './db';
import { ROLE_HOME } from './constants';

const SESSION = 'vg_session';
const PENDING = 'vg_pending'; // short-lived: password accepted, 2FA still to do

const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
const opts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge,
});

const sign = (payload, exp) =>
  new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).sign(key());

async function verify(token) {
  try { return (await jwtVerify(token, key())).payload; } catch { return null; }
}

export async function setPending(user) {
  cookies().set(PENDING, await sign({ sub: user.id, purpose: 'mfa' }, '10m'), opts(600));
}

export async function setSession(user) {
  cookies().set(SESSION, await sign({ sub: user.id, role: user.role, purpose: 'session' }, '8h'), opts(60 * 60 * 8));
  cookies().delete(PENDING);
}

export function clearSession() {
  cookies().delete(SESSION);
  cookies().delete(PENDING);
}

export async function getPendingUserId() {
  const t = cookies().get(PENDING)?.value;
  const p = t && (await verify(t));
  return p?.purpose === 'mfa' ? p.sub : null;
}

// The session cookie only proves who you are. Role and status are always re-read from the
// database, so a role change or a deletion takes effect on the very next request.
export async function getUser() {
  const t = cookies().get(SESSION)?.value;
  const p = t && (await verify(t));
  if (!p || p.purpose !== 'session') return null;
  await ensureReady();
  const [u] = await sql`SELECT id, name, email, role, status, last_login, created_at,
                               must_change_password, pw_changed_at
                        FROM users WHERE id = ${p.sub}`;
  return u && u.status === 'active' ? plain(u) : null;
}

export async function requirePage(roles) {
  const u = await getUser();
  if (!u) redirect('/login');
  if (!roles.includes(u.role)) redirect(ROLE_HOME[u.role]);
  return u;
}

export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}

export async function requireApi(req, roles) {
  if (req.method !== 'GET' && !sameOrigin(req)) {
    return { error: NextResponse.json({ error: 'Blocked request.' }, { status: 403 }) };
  }
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: 'Your role cannot do this.' }, { status: 403 }) };
  }
  return { user };
}
