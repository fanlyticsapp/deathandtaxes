// Entry point: /api/* is handled here, everything else is served from ./public by Cloudflare's static assets.
import { handleContact } from './contact.js';
import { json } from './http.js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/contact') return handleContact(request, env, ctx);

    if (pathname === '/api/config') {
      return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' }, 200, { 'Cache-Control': 'public, max-age=300' });
    }

    if (pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found.' }, 404);

    return env.ASSETS.fetch(request);
  },
};
