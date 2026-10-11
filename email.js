/**
 * email.js — confirmation emails for new registrations.
 *
 * To activate emails: set EMAIL_ENABLED=true in .env and fill in the SMTP
 * settings and MAIL_FROM below — any SMTP provider works (SendGrid,
 * Mailgun, Resend, Postmark, the client's own mail server), so switching
 * provider is a settings change, not a code change. To use a provider's own
 * API instead of SMTP, install it (e.g. npm install @sendgrid/mail) and
 * replace the sendEmail function below with the provider's implementation.
 * See README for setup instructions.
 *
 * Until then, every confirmation is written to the server console instead
 * of being sent, so the whole flow can be seen working in development
 * without an email account. The console copy includes the recipient's name
 * and address (fine on a developer's machine; on a real server those end up
 * in its logs) but never the teacher's private portal link, which is a
 * credential.
 */

// ============================================================================
// PROVIDER SETUP — settings live in .env, never in this file.
// ============================================================================
//
//   EMAIL_ENABLED=true
//   SMTP_HOST=smtp.sendgrid.net        (your provider's SMTP server)
//   SMTP_PORT=587                      (465 = TLS from the start; 587 upgrades)
//   SMTP_USER=apikey                   (provider-specific; may be blank)
//   SMTP_PASS=SG.xxxxx
//   MAIL_FROM="SACTH NZ Tech Week <noreply@your-domain.nz>"
//
// MAIL_FROM must be on a domain the client controls, with SPF/DKIM set up,
// or messages will land in spam.
//
// To use an HTTP API instead of SMTP, replace the body of sendEmail(). e.g.
// SendGrid (npm install @sendgrid/mail):
//
//   const sgMail = require('@sendgrid/mail');
//   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//   await sgMail.send({ to, from: process.env.MAIL_FROM, subject, html, text,
//     attachments: attachments.map((a) => ({ filename: a.filename, type: 'image/png',
//       content: a.content.toString('base64'), disposition: 'inline', content_id: a.cid })) });
// ============================================================================

const nodemailer = require('nodemailer');

let transporter = null;

/** Built on first use, so it reads the .env that server.js has loaded. */
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) {
    throw new Error('EMAIL_ENABLED=true, but SMTP_HOST and MAIL_FROM are not both set in .env.');
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS from the start; 587 upgrades after connecting
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }
  return transporter;
}

/**
 * Sends one email through the real provider. Only ever called when
 * EMAIL_ENABLED=true. Replace this body to use a provider's HTTP API.
 */
async function sendEmail({ to, subject, html, text, attachments }) {
  await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, text, html, attachments });
}

// ----------------------------------------------------------------------------
// Everything below works the same whichever provider is used.
// ----------------------------------------------------------------------------

const EVENT_NAME = 'NZ Tech Week 2027';

/** Read at send time, not at startup, so it always reflects the loaded .env. */
function emailEnabled() {
  return String(process.env.EMAIL_ENABLED || '').trim().toLowerCase() === 'true';
}

/** Names, schools and links are escaped before going into the HTML body. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A subject line must be one line, whatever a visitor typed. */
function oneLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * The wording for each kind of registration. A teacher does not pick a
 * workshop — their students each choose one when they sign up through the
 * class link — so the teacher version says that instead.
 */
function messageFor(data) {
  if (data.registrationType === 'teacher') {
    return {
      subject: data.schoolName
        ? `You're registered for ${EVENT_NAME} — ${oneLine(data.schoolName)}`
        : `Your class is registered for ${EVENT_NAME}`,
      intro: data.schoolName
        ? `Thank you for registering ${data.schoolName} for ${EVENT_NAME}. We can't wait to see you all there.`
        : `Thank you for registering your class for ${EVENT_NAME}. We can't wait to see you all there.`,
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

/**
 * Builds { subject, html, text, attachments } (send both bodies — spam
 * filters like it).
 *
 * Teacher emails also carry the two links from registration: the student
 * sign-up link with its QR code, and the private portal link. Email is the
 * only place a teacher can find the portal link again later, so it is
 * worth including — with a clear "keep this to yourself".
 *
 * Gmail and Outlook block data: images, so the QR code travels as an inline
 * attachment that the HTML refers to by its cid.
 */
function buildConfirmationEmail(data, { hidePortalLink = false } = {}) {
  const message = messageFor(data);
  const name = data.recipientName || 'there';
  const eventDate = data.eventDate || 'Date to be confirmed';
  const eventLocation = data.eventLocation || 'Venue to be confirmed';
  const portalLink = hidePortalLink && data.portalLink ? '[portal link hidden from logs]' : data.portalLink;
  const qrPng = data.qrCode && String(data.qrCode).startsWith('data:image/png;base64,')
    ? Buffer.from(String(data.qrCode).split(',')[1], 'base64')
    : null;

  // Event details placeholder — times, what to bring, parking etc. are not
  // decided yet. Replace this line once SACTH confirms them.
  const detailsPlaceholder = 'Times, what to bring and arrival details will be sent closer to the day.';

  const linksHtml = (data.studentLink || portalLink) ? `
        <tr><td style="padding:0 32px 24px;">
          ${data.studentLink ? `
          <p style="font-size:15px; font-weight:bold; margin:0 0 6px;">Student sign-up link</p>
          <p style="font-size:14px; line-height:1.6; color:#4a524e; margin:0 0 8px;">Share this link, or the QR code, with your students so they can add themselves to your class.</p>
          <p style="font-size:14px; margin:0 0 12px; word-break:break-all;"><a href="${escapeHtml(data.studentLink)}" style="color:#1d9e75;">${escapeHtml(data.studentLink)}</a></p>
          ${qrPng ? '<p style="margin:0 0 20px;"><img src="cid:studentqr" alt="QR code for the student sign-up link" width="180" height="180" style="display:block;"></p>' : ''}` : ''}
          ${portalLink ? `
          <p style="font-size:15px; font-weight:bold; margin:0 0 6px;">Your private teacher link</p>
          <p style="font-size:14px; line-height:1.6; color:#4a524e; margin:0 0 8px;">Keep this to yourself — anyone with it can manage your class. Use it to see who has signed up and add students by hand.</p>
          <p style="font-size:14px; margin:0; word-break:break-all;"><a href="${escapeHtml(portalLink)}" style="color:#1d9e75;">${escapeHtml(portalLink)}</a></p>` : ''}
        </td></tr>` : '';

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
${linksHtml}
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
    ...(data.studentLink ? ['', 'Student sign-up link (share this with your students):', data.studentLink] : []),
    ...(portalLink ? ['', 'Your private teacher link (keep this to yourself - it lets you manage your class):', portalLink] : []),
    '',
    detailsPlaceholder,
    'Questions? Email sacth@thecausecollective.org.nz or call +64 9 869 2433.'
  ].join('\n');

  const attachments = qrPng ? [{ filename: 'qr.png', content: qrPng, cid: 'studentqr' }] : [];

  return { subject: message.subject, html, text, attachments };
}

/**
 * sendConfirmationEmail(to, data)
 *
 * `data`: { recipientName, workshopName, eventDate, eventLocation,
 *           registrationType: 'student' | 'teacher',
 *           // teacher only, all optional:
 *           schoolName, studentLink, portalLink, qrCode (PNG data URL) }
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

    if (!emailEnabled()) {
      const preview = buildConfirmationEmail(data, { hidePortalLink: true });
      console.log([
        '[email] EMAIL_ENABLED is not true — logging instead of sending:',
        `  To:      ${to}`,
        `  Subject: ${preview.subject}`,
        ...preview.text.split('\n').map((line) => `  | ${line}`)
      ].join('\n'));
      return { sent: false, reason: 'disabled' };
    }

    const email = buildConfirmationEmail(data);
    await sendEmail({ to, ...email });
    console.log(`[email] Confirmation sent to ${to}.`);
    return { sent: true };
  } catch (err) {
    console.error(`[email] Could not send confirmation to ${to}: ${err.message}`);
    return { sent: false, reason: 'error' };
  }
}

module.exports = { sendConfirmationEmail, buildConfirmationEmail };
