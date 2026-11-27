// Sends emails: through your own mailbox (Gmail SMTP), or Resend as an alternative.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const spaced = (c) => `${c.slice(0, 3)} ${c.slice(3)}`;
const first = (name) => esc(String(name).split(' ')[0]);

let transport;
async function smtp() {
  if (!transport) {
    const { default: nodemailer } = await import('nodemailer');
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s/g, '') },
    });
  }
  return transport;
}

// Order: your own mailbox over SMTP (Gmail) > Resend > console log (local development only).
async function deliver({ to, subject, html, text }) {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const from = process.env.EMAIL_FROM || `VaultGate <${process.env.SMTP_USER}>`;
    await (await smtp()).sendMail({ from, to, subject, html, text });
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[VaultGate dev] email to ${to}: ${subject}\n${text}\n`); // local testing only
      return;
    }
    throw new Error('No email service is set up. Add SMTP_USER and SMTP_PASS (or RESEND_API_KEY).');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'VaultGate <onboarding@resend.dev>', to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Email provider rejected the message (${res.status}): ${await res.text()}`);
}

const shell = (inner) => `<!doctype html><body style="margin:0;background:#f3f2ff;font-family:Inter,Arial,sans-serif;color:#17143a">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:800;font-size:20px;margin-bottom:18px">VaultGate</div>
    <div style="background:#fff;border-radius:18px;padding:30px;border:1px solid #e1dfff">${inner}</div>
    <p style="color:#8785ad;font-size:12px;margin-top:16px;text-align:center">VaultGate · Identity, secured</p>
  </div></body>`;

const codeBox = (code) =>
  `<div style="font-family:Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:8px;background:#f3f2ff;border-radius:12px;padding:16px;text-align:center">${spaced(code)}</div>`;

// purpose: 'signin' (normal login) or 'verify' (finishing a new registration)
export async function sendOtpEmail(to, name, code, purpose = 'signin') {
  const verify = purpose === 'verify';
  const action = verify ? 'finish creating your account' : 'finish signing in';
  await deliver({
    to,
    subject: `${spaced(code)} is your VaultGate ${verify ? 'verification' : 'sign-in'} code`,
    html: shell(`
      <p style="margin:0 0 6px;font-size:16px">Hi ${first(name)},</p>
      <p style="margin:0 0 20px;color:#5f5c8c">Use this code to ${action}:</p>${codeBox(code)}
      <p style="margin:20px 0 0;color:#5f5c8c;font-size:14px">It expires in 10 minutes. If this wasn’t you, ignore this email. Nobody from VaultGate will ever ask you for this code.</p>`),
    text: `Your VaultGate code is ${spaced(code)}. Use it to ${action}. It expires in 10 minutes. If this wasn’t you, ignore this email.`,
  });
}

export async function sendResetEmail(to, name, code) {
  await deliver({
    to,
    subject: `${spaced(code)} is your VaultGate password reset code`,
    html: shell(`
      <p style="margin:0 0 6px;font-size:16px">Hi ${first(name)},</p>
      <p style="margin:0 0 20px;color:#5f5c8c">We got a request to reset your password. Enter this code on the reset page:</p>${codeBox(code)}
      <p style="margin:20px 0 0;color:#5f5c8c;font-size:14px">It expires in 10 minutes. If you didn’t ask for this, you can ignore this email and your password stays the same.</p>`),
    text: `Your VaultGate password reset code is ${spaced(code)}. It expires in 10 minutes. If you didn’t ask for this, ignore this email and your password stays the same.`,
  });
}

export async function sendPasswordChangedEmail(to, name) {
  await deliver({
    to,
    subject: 'Your VaultGate password was changed',
    html: shell(`
      <p style="margin:0 0 6px;font-size:16px">Hi ${first(name)},</p>
      <p style="margin:0 0 12px;color:#5f5c8c">The password on your VaultGate account was just changed.</p>
      <p style="margin:0;color:#5f5c8c;font-size:14px">If this was you, there’s nothing to do. If it wasn’t, use “Forgot password” on the sign-in page right away and tell an administrator.</p>`),
    text: 'The password on your VaultGate account was just changed. If this was you, there is nothing to do. If it was not, use "Forgot password" on the sign-in page right away and tell an administrator.',
  });
}
