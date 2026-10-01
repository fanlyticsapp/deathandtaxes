// Entry point: /api/* is handled here, everything else is served from ./public by Cloudflare's static assets.
import { handleContact } from './contact.js';
import { json } from './http.js';

// The site has always lived at www.dataccounting.co (that's what search engines have indexed), so the bare domain
// and plain http:// both redirect to https://www.dataccounting.co.
const BARE_HOST = 'dataccounting.co';
const CANONICAL_HOST = 'www.dataccounting.co';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const onProductionHost = url.hostname === BARE_HOST || url.hostname === CANONICAL_HOST;
    if (onProductionHost && (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:')) {
      url.protocol = 'https:';
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    const { pathname } = url;

    if (pathname === '/api/contact') return handleContact(request, env, ctx);

    if (pathname === '/api/config') {
      return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' }, 200, { 'Cache-Control': 'public, max-age=300' });
    }

    if (pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found.' }, 404);

    return env.ASSETS.fetch(request);
  },
};
