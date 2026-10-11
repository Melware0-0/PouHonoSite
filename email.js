/**
 * email.js — confirmation emails for new registrations.
 *
 * To activate emails: set EMAIL_ENABLED=true in .env, install your chosen
 * provider (e.g. npm install @sendgrid/mail), and replace the sendEmail
 * function below with the provider's implementation. See README for setup
 * instructions.
 *
 * Until then, every confirmation is written to the server console instead
 * of being sent, so the whole flow can be seen working in development
 * without an email account.
 *
 * Note that the console copy contains the recipient's name and address.
 * That is fine on a developer's machine; on a real server, either turn
 * emails on or be aware those details end up in its logs.
 */

// ============================================================================
// PROVIDER SETUP — this is the only part to change when the client is ready.
// ============================================================================
//
// 1. Add to .env (never to this file — .env is gitignored, this file is not):
//
//      EMAIL_ENABLED=true
//      EMAIL_FROM="SACTH NZ Tech Week <noreply@your-domain.nz>"
//      ...plus the provider's own key, e.g.
//      SENDGRID_API_KEY=SG.xxxxx                 (SendGrid)
//      MAILGUN_API_KEY=xxxxx  MAILGUN_DOMAIN=mg.your-domain.nz   (Mailgun)
//      SMTP_HOST=...  SMTP_PORT=587  SMTP_USER=...  SMTP_PASS=...  (Nodemailer)
//
// 2. npm install the provider's package.
//
// 3. Replace the body of sendEmail() below with ONE of these:
//
//    --- SendGrid (npm install @sendgrid/mail) -------------------------------
//      const sgMail = require('@sendgrid/mail');
//      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//      await sgMail.send({ to, from: emailFrom(), subject, html, text });
//
//    --- Mailgun (npm install mailgun.js form-data) --------------------------
//      const Mailgun = require('mailgun.js');
//      const mg = new Mailgun(require('form-data')).client({
//        username: 'api', key: process.env.MAILGUN_API_KEY
//      });
//      await mg.messages.create(process.env.MAILGUN_DOMAIN,
//        { to, from: emailFrom(), subject, html, text });
//
//    --- Nodemailer / any SMTP server (npm install nodemailer) ---------------
//      const nodemailer = require('nodemailer');
//      const transport = nodemailer.createTransport({
//        host: process.env.SMTP_HOST,
//        port: Number(process.env.SMTP_PORT || 587),
//        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
//      });
//      await transport.sendMail({ to, from: emailFrom(), subject, html, text });
//
// (Create the client once, outside the function, if you prefer — these are
// written inline so each example is complete in one place.)
// ============================================================================

/**
 * Sends one email through the real provider. Only ever called when
 * EMAIL_ENABLED=true.
 *
 * REPLACE THIS FUNCTION'S BODY with your provider's code (see above).
 *
 * Until it is replaced it throws on purpose: turning EMAIL_ENABLED on
 * without wiring up a provider should fail loudly in the server log, not
 * look as if mail went out when none did.
 */
async function sendEmail({ to, subject, html, text }) {
  throw new Error('EMAIL_ENABLED=true, but no email provider is set up yet — see sendEmail() in email.js.');
}

// ----------------------------------------------------------------------------
// Everything below works the same whichever provider is used.
// ----------------------------------------------------------------------------

const EVENT_NAME = 'NZ Tech Week 2027';

/** Read at send time, not at startup, so it always reflects the loaded .env. */
function emailEnabled() {
  return String(process.env.EMAIL_ENABLED || '').trim().toLowerCase() === 'true';
}

function emailFrom() {
  return process.env.EMAIL_FROM || 'SACTH NZ Tech Week <noreply@example.invalid>';
}

/** Names and school details are user-typed, so everything is escaped. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The wording for each kind of registration. A teacher does not pick a
 * workshop — their students each choose one when they sign up through the
 * class link — so the teacher version says that instead.
 */
function messageFor(data) {
  if (data.registrationType === 'teacher') {
    return {
      subject: `Your class is registered for ${EVENT_NAME}`,
      intro: `Thank you for registering your class for ${EVENT_NAME}. We can't wait to see you all there.`,
      workshopLine: 'Your students choose their own workshop when they sign up using your class link.'
    };
  }
  return {
    subject: `You're registered for ${EVENT_NAME}`,
    intro: `Thank you for registering for ${EVENT_NAME}. We can't wait to see you there.`,
    workshopLine: data.workshopName
      ? `Your workshop: ${data.workshopName}`
      : 'Your workshop will be confirmed soon.'
  };
}

/** Builds the subject plus HTML and plain-text bodies (send both — spam filters like it). */
function buildConfirmationEmail(data) {
  const message = messageFor(data);
  const name = data.recipientName || 'there';
  const eventDate = data.eventDate || 'Date to be confirmed';
  const eventLocation = data.eventLocation || 'Venue to be confirmed';

  // Event details placeholder — times, what to bring, parking etc. are not
  // decided yet. Replace this line once SACTH confirms them.
  const detailsPlaceholder = 'Times, what to bring and arrival details will be sent closer to the day.';

  // Table layout and inline styles throughout: many email clients (Outlook
  // especially) ignore <style> blocks and modern CSS layout.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(message.subject)}</title>
</head>
<body style="margin:0; padding:0; background:#f3f5f4; font-family:Arial, Helvetica, sans-serif; color:#1b1f1d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f4; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden;">

        <tr><td style="background:#0f3d2e; padding:24px 32px; color:#ffffff;">
          <div style="font-size:13px; letter-spacing:1px; text-transform:uppercase; opacity:0.8;">SACTH &amp; The Cause Collective</div>
          <div style="font-size:22px; font-weight:bold; margin-top:4px;">${escapeHtml(EVENT_NAME)}</div>
        </td></tr>

        <tr><td style="padding:32px 32px 8px;">
          <p style="font-size:18px; margin:0 0 12px;">Kia ora ${escapeHtml(name)},</p>
          <p style="font-size:15px; line-height:1.6; margin:0 0 12px;">${escapeHtml(message.intro)}</p>
          <p style="font-size:15px; line-height:1.6; margin:0; font-weight:bold;">${escapeHtml(message.workshopLine)}</p>
        </td></tr>

        <!-- Save the date -->
        <tr><td style="padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #1d9e75; border-radius:12px;">
            <tr><td align="center" style="padding:24px 16px;">
              <div style="font-size:12px; letter-spacing:3px; text-transform:uppercase; color:#1d9e75; font-weight:bold;">Save the date</div>
              <div style="font-size:22px; font-weight:bold; margin:10px 0 6px;">${escapeHtml(eventDate)}</div>
              <div style="font-size:15px; color:#4a524e;">${escapeHtml(eventLocation)}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <p style="font-size:14px; line-height:1.6; color:#4a524e; margin:0 0 12px;">${escapeHtml(detailsPlaceholder)}</p>
          <p style="font-size:14px; line-height:1.6; color:#4a524e; margin:0;">Questions? Email <a href="mailto:sacth@thecausecollective.org.nz" style="color:#1d9e75;">sacth@thecausecollective.org.nz</a> or call +64 9 869 2433.</p>
        </td></tr>

        <tr><td style="background:#f3f5f4; padding:16px 32px; font-size:12px; color:#7a827e;">
          You're getting this email because you registered for ${escapeHtml(EVENT_NAME)}. A Cause Collective &amp; SACTH initiative.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Kia ora ${name},`,
    '',
    message.intro,
    message.workshopLine,
    '',
    'SAVE THE DATE',
    eventDate,
    eventLocation,
    '',
    detailsPlaceholder,
    'Questions? Email sacth@thecausecollective.org.nz or call +64 9 869 2433.'
  ].join('\n');

  return { subject: message.subject, html, text };
}

/**
 * sendConfirmationEmail(to, data)
 *
 * `data`: { recipientName, workshopName, eventDate, eventLocation,
 *           registrationType: 'student' | 'teacher' }
 *
 * Never throws and never needs awaiting: a registration has already been
 * saved by the time this runs, and a slow or broken email provider must not
 * turn that success into an error for the person registering. Problems are
 * logged instead. Resolves to { sent: boolean, reason?: string } for anyone
 * who does want to know.
 */
async function sendConfirmationEmail(to, data = {}) {
  try {
    // Students are not asked for an email address at the moment, so most
    // student sign-ups arrive here with none. Nothing to send to — but the
    // call stays in place so adding an email field later just works.
    if (!to) {
      console.log(`[email] No address on this ${data.registrationType || 'registration'}, so no confirmation was sent.`);
      return { sent: false, reason: 'no-address' };
    }

    const email = buildConfirmationEmail(data);

    if (!emailEnabled()) {
      console.log([
        '[email] EMAIL_ENABLED is not true — logging instead of sending:',
        `  To:      ${to}`,
        `  Subject: ${email.subject}`,
        ...email.text.split('\n').map((line) => `  | ${line}`)
      ].join('\n'));
      return { sent: false, reason: 'disabled' };
    }

    await sendEmail({ to, subject: email.subject, html: email.html, text: email.text });
    console.log(`[email] Confirmation sent to ${to}.`);
    return { sent: true };
  } catch (err) {
    console.error(`[email] Could not send confirmation to ${to}: ${err.message}`);
    return { sent: false, reason: 'error' };
  }
}

module.exports = { sendConfirmationEmail, buildConfirmationEmail };
