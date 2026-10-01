// Builds and sends the "new request" email to the firm with Cloudflare Email Service (the EMAIL send_email binding).
// Sending to a verified destination address in the same Cloudflare account is free on every plan.

const TIME_ZONE = 'America/New_York';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function receivedAt(date = new Date()) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(date);
  return `${formatted} ET`;
}

export function buildEmail(data, date = new Date()) {
  const rows = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || 'Not provided'],
    ['Business name', data.business || 'Not provided'],
  ];
  const when = receivedAt(date);

  const subject = `New consultation request from ${data.name}`;

  const text = [
    'New consultation request from the website',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    data.message,
    '',
    `Received: ${when}`,
    'Reply to this email to respond directly.',
  ].join('\n');

  const tableRows = rows
    .map(([label, value]) => `
        <tr>
          <td style="padding:10px 16px 10px 0;color:#4A5A6B;font-size:14px;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:10px 0;color:#1B2A3A;font-size:15px;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`)
    .join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FBF5EA;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF8;border:1px solid #E6DCC8;border-radius:16px;">
      <tr>
        <td style="padding:28px 32px 8px;">
          <p style="margin:0 0 6px;color:#B4552F;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Website request</p>
          <h1 style="margin:0;color:#1B2A3A;font-size:22px;line-height:1.3;">New consultation request</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${tableRows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;">
          <p style="margin:0 0 8px;color:#4A5A6B;font-size:14px;">Message</p>
          <div style="padding:16px 18px;background:#FBF5EA;border-left:3px solid #F4A259;border-radius:8px;color:#1B2A3A;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 28px;color:#4A5A6B;font-size:13px;">
          Received ${escapeHtml(when)}. Reply to this email to respond directly.
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

/**
 * Returns 'sent', 'failed', or 'skipped' (no EMAIL binding configured).
 */
export async function sendNotification(data, env) {
  const { subject, text, html } = buildEmail(data);

  if (!env.EMAIL) {
    console.log(`[email skipped: no EMAIL binding]\nTo: ${env.NOTIFY_EMAIL}\nSubject: ${subject}\n\n${text}`);
    return 'skipped';
  }

  try {
    await env.EMAIL.send({
      to: env.NOTIFY_EMAIL,
      from: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM },
      replyTo: { name: data.name, email: data.email },
      subject,
      text,
      html,
    });
    return 'sent';
  } catch (err) {
    console.error(`Cloudflare Email Service rejected the email (${err.code || 'unknown'}): ${err.message}`);
    return 'failed';
  }
}
