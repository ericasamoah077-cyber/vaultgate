// Usage: BACKUP_KEY="your key" node scripts/decrypt-backup.js path/to/vaultgate-backup.json.enc > backup.json
const { createDecipheriv, scryptSync } = require('node:crypto');
const fs = require('node:fs');

const file = process.argv[2];
const secret = process.env.BACKUP_KEY || process.env.JWT_SECRET;
if (!file || !secret) { console.error('Usage: BACKUP_KEY=... node scripts/decrypt-backup.js <file>'); process.exit(1); }

const buf = fs.readFileSync(file);
const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), data = buf.subarray(28);
const decipher = createDecipheriv('aes-256-gcm', scryptSync(secret, 'vaultgate-backup', 32), iv);
decipher.setAuthTag(tag);
process.stdout.write(Buffer.concat([decipher.update(data), decipher.final()]));
