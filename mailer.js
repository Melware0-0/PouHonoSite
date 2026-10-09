/**
 * mailer.js — sends the confirmation email after a class registers.
 * -------------------------------------------------------------------
 * Email is OPTIONAL. If SMTP_HOST or MAIL_FROM is not set (see
 * .env.example), nothing is sent and the app works exactly as before. That
 * keeps local development, demos and load tests free of real email.
 *
 * Any SMTP provider works (Resend, SendGrid, Postmark, the client's own
 * mail server), so switching provider later is a settings change, not a
 * code change.
 */
const nodemailer = require('nodemailer');

const configured = Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
const port = Number(process.env.SMTP_PORT) || 587;

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS from the start; 587 upgrades after connecting
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

// School and contact names are typed by visitors, so they are escaped before
// being placed in the HTML body. Otherwise a name like <b>x</b> would be
// treated as markup inside the email.
function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Sends the confirmation. Resolves quietly when email is not configured;
 * rejects if the mail server refuses, so the caller can log it.
 */
async function sendRegistrationConfirmation({ to, contact, school, session, date, link, portalLink, qrCode }) {
  if (!transporter) {
    console.log('Email not configured (SMTP_HOST / MAIL_FROM); skipping confirmation email.');
    return;
  }

  // A subject line must be a single line.
  const subject = `You're registered for NZ Tech Week 2027 - ${String(school).replace(/[\r\n]+/g, ' ')}`;

  const text = [
    `Kia ora ${contact},`,
    '',
    `Thanks for registering ${school} for ${session} on ${date}.`,
    '',
    'Student sign-up link (share this with your students):',
    link,
    '',
    'Your private teacher link (keep this to yourself - it lets you manage your class):',
    portalLink,
  ].join('\n');

  const html = `
    <p>Kia ora ${esc(contact)},</p>
    <p>Thanks for registering <strong>${esc(school)}</strong> for ${esc(session)} on ${esc(date)}.</p>
    <p><strong>Student sign-up link</strong> &mdash; share this, or the QR code below, with your students:<br>
       <a href="${esc(link)}">${esc(link)}</a></p>
    ${qrCode ? '<p><img src="cid:studentqr" alt="QR code for the student sign-up link" width="200" height="200"></p>' : ''}
    <p><strong>Your private teacher link</strong> &mdash; keep this to yourself, it lets you manage your class:<br>
       <a href="${esc(portalLink)}">${esc(portalLink)}</a></p>`;

  // Gmail and Outlook block data: images, so the QR code travels as an inline
  // attachment that the HTML refers to by its cid.
  const attachments = qrCode
    ? [{ filename: 'qr.png', content: Buffer.from(qrCode.split(',')[1], 'base64'), cid: 'studentqr' }]
    : [];

  await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html, attachments });
}

module.exports = { sendRegistrationConfirmation };
