import { neon } from '@neondatabase/serverless';
import { hashPassword } from './security';

let client;
function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

// Tagged-template query helper, created lazily so builds work without env vars.
export const sql = (strings, ...values) => getClient()(strings, ...values);

// Turns rows (with Date objects) into plain JSON so they can go to client components.
export const plain = (x) => JSON.parse(JSON.stringify(x));

let ready;
export function ensureReady() {
  if (!ready) ready = init().catch((e) => { ready = null; throw e; });
  return ready;
}

async function init() {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','staff','user')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
    salt text NOT NULL,
    password_hash text NOT NULL,
    must_change_password boolean NOT NULL DEFAULT false,
    pw_changed_at timestamptz NOT NULL DEFAULT now(),
    otp_hash text,
    otp_expires timestamptz,
    otp_attempts int NOT NULL DEFAULT 0,
    otp_sent_at timestamptz,
    reset_hash text,
    reset_expires timestamptz,
    reset_attempts int NOT NULL DEFAULT 0,
    reset_sent_at timestamptz,
    failed_attempts int NOT NULL DEFAULT 0,
    locked_until timestamptz,
    last_login timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    deleted_by text
  )`;
  // Older installs: add the email-code columns.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_hash text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires timestamptz`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts int NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_sent_at timestamptz`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_hash text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires timestamptz`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_attempts int NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_sent_at timestamptz`;
  await sql`CREATE TABLE IF NOT EXISTS audit_log (
    id bigserial PRIMARY KEY,
    actor_id uuid,
    actor_name text NOT NULL DEFAULT 'system',
    action text NOT NULL,
    target text NOT NULL DEFAULT '',
    detail text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS backups (
    id bigserial PRIMARY KEY,
    url text NOT NULL,
    size int NOT NULL,
    kind text NOT NULL,
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

  // Seed the first admin from env vars if no admin exists.
  const admins = await sql`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`;
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!admins.length && ADMIN_EMAIL && ADMIN_PASSWORD) {
    const { salt, hash } = await hashPassword(ADMIN_PASSWORD);
    await sql`INSERT INTO users (name, email, role, salt, password_hash)
              VALUES (${ADMIN_NAME || 'Site Admin'}, ${ADMIN_EMAIL.trim().toLowerCase()}, 'admin', ${salt}, ${hash})
              ON CONFLICT (email) DO NOTHING`;
  }
}
