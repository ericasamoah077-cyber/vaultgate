import { sql } from './db';

export async function audit(actor, action, target = '', detail = '') {
  try {
    await sql`INSERT INTO audit_log (actor_id, actor_name, action, target, detail)
              VALUES (${actor?.id ?? null}, ${actor?.name ?? 'system'}, ${action}, ${target}, ${detail})`;
  } catch (e) {
    console.error('audit failed', e);
  }
}
