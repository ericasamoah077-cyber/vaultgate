// Human-readable names for audit-log actions.
export const ACTIONS = {
  login: { text: 'Signed in', tone: 'ok' },
  login_failed: { text: 'Failed sign-in', tone: 'red' },
  logout: { text: 'Signed out', tone: '' },
  user_created: { text: 'Member added', tone: 'teal' },
  role_changed: { text: 'Role changed', tone: '' },
  user_deleted: { text: 'Member deleted', tone: 'red' },
  user_restored: { text: 'Member restored', tone: 'ok' },
  backup: { text: 'Cloud backup', tone: 'teal' },
  user_registered: { text: 'Self-registered', tone: 'teal' },
  password_reset_requested: { text: 'Password reset requested', tone: '' },
  password_reset: { text: 'Password reset', tone: 'amber' },
  password_changed: { text: 'Password changed', tone: 'amber' },
  profile_updated: { text: 'Profile updated', tone: 'amber' },
};

// Sentence for the member's own activity feed.
export function describe(ev, meId) {
  const mine = ev.actor_id === meId;
  switch (ev.action) {
    case 'login': return 'You signed in';
    case 'user_registered': return 'You created your account';
    case 'password_reset': return 'You reset your password';
    case 'password_changed': return 'You changed your password';
    case 'profile_updated': return 'You updated your name';
    case 'role_changed': return `Your role was changed (${ev.detail})`;
    case 'user_created': return mine ? 'Account created' : 'Your account was created by an administrator';
    case 'user_restored': return 'Your account was restored';
    default: return ACTIONS[ev.action]?.text || ev.action;
  }
}
