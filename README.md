# VaultGate: Identity, secured

Login system with two-factor authentication by email code, role-based dashboards (admin, staff, user), salted and peppered password hashing, soft-delete with restore, audit log and encrypted cloud backups. Built with Next.js 14 for Vercel.

## Deploy on Vercel (about 10 minutes)

1. **Push to GitHub.** Create a repository, then from this folder run `git init && git add . && git commit -m "VaultGate" && git remote add origin <your-repo-url> && git push -u origin main`.
2. **Import the project.** In Vercel choose *Add New > Project*, pick the repository and keep the default Next.js settings. Don't deploy yet if you can add the variables first (step 5), or redeploy after.
3. **Add a database.** Project > *Storage* > *Create Database* > **Neon (Postgres)** > connect it to the project. This adds `DATABASE_URL` automatically. Tables are created on the first request, so there is nothing to run.
4. **Add cloud storage for backups.** Project > *Storage* > *Create* > **Blob** > connect it. This adds `BLOB_READ_WRITE_TOKEN` automatically.
5. **Set up email for sign-in codes (your own Gmail, no domain needed).**
   1. Sign in to the Google account you want to send from. Open *Manage your Google Account* > *Security* and turn on **2-Step Verification**.
   2. Open [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), name the app `VaultGate` and click *Create*. Google shows a 16-letter password. Copy it.
   3. You'll use your Gmail address as `SMTP_USER` and that 16-letter password as `SMTP_PASS` in the next step. Gmail allows roughly 500 emails a day on a personal account, which is plenty for sign-in codes.
   (Prefer Resend? Set `RESEND_API_KEY` instead; it needs a verified domain to email other people.)
6. **Add environment variables** (Project > *Settings* > *Environment Variables*). Generate each secret with `openssl rand -base64 48`:

   | Variable | What it is |
   |---|---|
   | `PEPPER` | Secret mixed into every password hash. Never stored in the database. **Don't change it later**, or every existing password stops working. |
   | `JWT_SECRET` | Signs login cookies. |
   | `BACKUP_KEY` | Encrypts backups. **Keep a copy somewhere safe**: without it a backup can't be read. |
   | `CRON_SECRET` | Lets Vercel Cron run the daily backup. |
   | `SMTP_USER`, `SMTP_PASS` | Your Gmail address and its 16-letter App Password (step 5). Sends the sign-in, verification and password-reset emails. |
   | `EMAIL_FROM` | Optional. For example `VaultGate <yourname@gmail.com>`. |
   | `ALLOW_REGISTRATION` | Optional. `true` (default) lets people create their own account at `/register`; set `false` to close sign-up. |
   | `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your first admin account (use a real inbox for the email, because the sign-in code goes there; password: 10+ characters, letters and a number). |

7. **Deploy** (or *Redeploy*). Open the site, select *Sign in*, use the admin email and password, then enter the 6-digit code that arrives in your inbox.
8. After the first admin exists you can remove `ADMIN_PASSWORD` from the environment variables.

## How the pieces work

- **Identification:** every account has a unique ID and a unique email.
- **Salt and pepper:** `HMAC-SHA256(pepper, password)` is run through `scrypt` with a random 16-byte salt per user (see `lib/security.js`). The salt and hash are stored in the database; the pepper only lives in `PEPPER`.
- **Two-factor by email:** after the password is accepted, a random 6-digit code is emailed. Only a peppered hash of it is stored; it expires after 10 minutes, allows 5 tries, and can be re-sent every 30 seconds. Login only completes after both steps.
- **Roles:** `middleware.js` blocks the wrong dashboard, and every page and API route re-checks the role against the database, so role changes and deletions apply on the next request.
- **Delete and restore:** deletes are soft. Staff can delete users (they leave the staff view); admins see them labelled *Deleted* and can restore them.
- **Registration:** `/register` creates a regular *user* after the person confirms their email with a code. Only an admin can raise a role.
- **Forgot password:** `/forgot` emails a 6-digit reset code (10 minutes, 5 tries). After the reset, a notice email says the password changed. The page never reveals whether an email has an account.
- **Lockout:** 5 wrong passwords or codes lock the account for 15 minutes.
- **Backups:** *Backup now* in the admin dashboard and a daily cron (`vercel.json`, 02:00 UTC) save an AES-256-GCM encrypted snapshot to Vercel Blob. To read one, download the file and run:
  `BACKUP_KEY="your key" node scripts/decrypt-backup.js file.json.enc > backup.json`
- **Admin sees hashes:** as requested, the admin Members table shows each salt and hash behind a *Reveal* button. Hashes are sensitive, so keep the number of admins small.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values; use a free Neon database URL for DATABASE_URL
# Without SMTP_USER/SMTP_PASS, sign-in codes are printed in the terminal while you develop locally
npm run dev
```
