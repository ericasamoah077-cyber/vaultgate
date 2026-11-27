import { sql } from './db';

// 5 failed attempts (password or 2FA code) lock the account for 15 minutes.
export async function registerFailure(id) {
  await sql`UPDATE users SET
      failed_attempts = CASE WHEN failed_attempts + 1 >= 5 THEN 0 ELSE failed_attempts + 1 END,
      locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END
    WHERE id = ${id}`;
}

export const isLocked = (u) => u?.locked_until && new Date(u.locked_until) > new Date();

export function lockMessage(u) {
  const mins = Math.max(1, Math.ceil((new Date(u.locked_until) - Date.now()) / 60000));
  return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
}
