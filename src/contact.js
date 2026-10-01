import { validateSubmission } from './validate.js';
import { sendNotification } from './email.js';
import { json } from './http.js';

const MAX_BODY_BYTES = 32 * 1024;
const FALLBACK_ERROR = 'Something went wrong sending your message. Please call 772-807-0064 or email Maura@dataccounting.co.';

async function readFields(request) {
  const type = request.headers.get('Content-Type') || '';
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new RangeError('Body too large');

  if (type.includes('application/json')) {
    const body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  }
  if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
    const form = await new Response(raw, { headers: { 'Content-Type': type } }).formData();
    const fields = {};
    for (const [key, value] of form) {
      if (typeof value === 'string') fields[key] = value;
    }
    return fields;
  }
  throw new TypeError('Unsupported content type');
}

async function verifyTurnstile(token, request, env) {
  // Turnstile is optional until its keys are configured; see README.
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== 'string' || !token) return false;

  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const outcome = await res.json();
    return outcome.success === true;
  } catch (err) {
    console.error('Turnstile verification request failed', err);
    return false;
  }
}

export async function handleContact(request, env, ctx) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  }

  // Only accept submissions sent from this site's own pages.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: 'Forbidden.' }, 403);
  }

  let fields;
  try {
    fields = await readFields(request);
  } catch (err) {
    const status = err instanceof RangeError ? 413 : 400;
    return json({ ok: false, error: FALLBACK_ERROR }, status);
  }

  // Honeypot: the "website" field is hidden from people, so only bots fill it in. Pretend it worked.
  if (fields.website) return json({ ok: true });

  const { data, errors, valid } = validateSubmission(fields);
  if (!valid) {
    return json({ ok: false, error: 'Please check the highlighted fields.', fields: errors }, 400);
  }

  if (!(await verifyTurnstile(fields['cf-turnstile-response'], request, env))) {
    return json({ ok: false, error: 'Please complete the spam check and try again.', turnstile: true }, 403);
  }

  let id = null;
  try {
    const row = await env.DB.prepare(
      'INSERT INTO submissions (name, email, phone, business_name, message) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id',
    )
      .bind(data.name, data.email, data.phone || null, data.business || null, data.message)
      .first();
    id = row?.id ?? null;
  } catch (err) {
    console.error('Failed to save submission', err);
  }

  const emailStatus = await sendNotification(data, env);

  if (id !== null) {
    ctx.waitUntil(
      env.DB.prepare('UPDATE submissions SET email_status = ?1 WHERE id = ?2')
        .bind(emailStatus, id)
        .run()
        .catch((err) => console.error('Failed to record email status', err)),
    );
  }

  // As long as the request was saved or emailed, it isn't lost.
  if (id === null && emailStatus !== 'sent') {
    return json({ ok: false, error: FALLBACK_ERROR }, 500);
  }
  return json({ ok: true });
}
