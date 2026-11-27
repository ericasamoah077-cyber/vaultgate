import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const HOME = { admin: '/admin', staff: '/staff', user: '/dashboard' };

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const need = pathname.startsWith('/admin') ? 'admin'
    : pathname.startsWith('/staff') ? 'staff'
    : pathname.startsWith('/dashboard') ? 'user' : null;
  if (!need) return NextResponse.next();

  let role = null;
  const token = req.cookies.get('vg_session')?.value;
  if (token && process.env.JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      if (payload.purpose === 'session') role = payload.role;
    } catch { /* invalid or expired */ }
  }
  if (!role) return NextResponse.redirect(new URL('/login', req.url));
  if (role !== need) return NextResponse.redirect(new URL(HOME[role] || '/login', req.url));
  return NextResponse.next();
}

// Pages re-check the role against the database too; this is the fast first gate.
export const config = { matcher: ['/admin/:path*', '/staff/:path*', '/dashboard/:path*'] };
